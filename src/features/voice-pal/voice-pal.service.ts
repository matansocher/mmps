import { promises as fs } from 'fs';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LOCAL_FILES_PATH } from '@core/config';
import { VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo';
import { MessageType, NotifierService } from '@core/notifier';
import { deleteFile, setFfmpegPath } from '@core/utils';
import { getTranslationToEnglish } from '@services/google-translate';
import { imgurUploadImage } from '@services/imgur';
import { OpenaiService } from '@services/openai';
import { BOTS, downloadAudioFromVideoOrAudio, getMessageData, MessageLoader, sendShortenedMessage, TelegramMessageData } from '@services/telegram';
import { VoicePalOption } from './interface';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { getKeyboardOptions, validateActionWithMessage } from './utils';
import { ANALYTIC_EVENT_NAMES, ANALYTIC_EVENT_STATES, IMAGE_ANALYSIS_PROMPT, VOICE_PAL_OPTIONS } from './voice-pal.config';

const loaderMessage = 'On it, One Second...';

@Injectable()
export class VoicePalService implements OnModuleInit {
  private readonly logger = new Logger(VoicePalService.name);
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mongoUserService: VoicePalMongoUserService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly openaiService: OpenaiService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.VOICE_PAL.id) private readonly bot: TelegramBot,
  ) {
    this.botToken = this.configService.get(BOTS.VOICE_PAL.token);
  }

  onModuleInit(): void {
    setFfmpegPath();
  }

  async handleActionSelection(message: Message, selection: string): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find((option: string) => VOICE_PAL_OPTIONS[option].displayName === selection);

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      const userExists = await this.mongoUserService.saveUserDetails(userDetails);
      this.notifier.notify(BOTS.VOICE_PAL, { action: ANALYTIC_EVENT_NAMES['/start'] }, userDetails);
      const newUserReplyText = replyText.replace('{name}', userDetails.firstName || userDetails.username || '');
      const existingUserReplyText = `All set 💪`;
      replyText = userExists ? existingUserReplyText : newUserReplyText;
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    await this.bot.sendMessage(chatId, replyText, getKeyboardOptions());
  }

  async handleAction(message: Message, userAction: VoicePalOption): Promise<void> {
    const { chatId, messageId, userDetails, text, audio, video, photo, file } = getMessageData(message);

    if (!userAction) {
      await this.bot.sendMessage(chatId, `Please select an action first.`);
      return;
    }

    const inputErrorMessage = validateActionWithMessage(userAction, { text, audio, video, photo, file });
    if (inputErrorMessage) {
      await this.bot.sendMessage(chatId, inputErrorMessage, getKeyboardOptions());
      return;
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[userAction.displayName];
    try {
      if (userAction?.showLoader) {
        const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { loadingAction: userAction.loaderType, reactionEmoji: '🤔', loaderMessage });
        await messageLoaderService.handleMessageWithLoader(async (): Promise<void> => {
          await this[userAction.handler]({ chatId, text, audio, video, photo, file });
        });
      } else {
        await this[userAction.handler]({ chatId, text, audio, video, photo, file });
      }

      this.notifier.notify(BOTS.VOICE_PAL, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.FULFILLED }, userDetails);
    } catch (err) {
      this.logger.error(`${this.handleAction.name} - error: ${err}`);
      this.notifier.notify(BOTS.VOICE_PAL, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.ERROR, error: `${err}` }, userDetails);
      throw err;
    }
  }

  async handleTranscribeAction({ chatId, video, audio }: Partial<TelegramMessageData>): Promise<void> {
    const { audioFileLocalPath, videoFileLocalPath } = await downloadAudioFromVideoOrAudio(
      this.bot,
      {
        video,
        audio,
      },
      LOCAL_FILES_PATH,
    );
    await this.notifier.collect(videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO, videoFileLocalPath || audioFileLocalPath);
    deleteFile(videoFileLocalPath);
    const replyText = await this.openaiService.getTranscriptFromAudio(audioFileLocalPath);
    await sendShortenedMessage(this.bot, chatId, replyText);
    await this.notifier.collect(MessageType.TEXT, replyText);
    await deleteFile(audioFileLocalPath);
  }

  async handleTranslateAction({ chatId, text, video, audio }: Partial<TelegramMessageData>): Promise<void> {
    let replyText: string;

    if (text) {
      await this.notifier.collect(MessageType.TEXT, text);
      replyText = await getTranslationToEnglish(text);
    } else {
      const { audioFileLocalPath, videoFileLocalPath } = await downloadAudioFromVideoOrAudio(
        this.bot,
        {
          video,
          audio,
        },
        LOCAL_FILES_PATH,
      );
      await this.notifier.collect(videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO, videoFileLocalPath || audioFileLocalPath);
      deleteFile(videoFileLocalPath);
      replyText = await this.openaiService.getTranslationFromAudio(audioFileLocalPath);
      deleteFile(audioFileLocalPath);
    }

    await sendShortenedMessage(this.bot, chatId, replyText);
    await this.notifier.collect(MessageType.TEXT, replyText);
  }

  async handleTextToSpeechAction({ chatId, text }: Partial<TelegramMessageData>): Promise<void> {
    await this.notifier.collect(MessageType.TEXT, text);
    const result = await this.openaiService.getAudioFromText(text);

    const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
    const buffer = Buffer.from(await result.arrayBuffer());
    await fs.writeFile(audioFilePath, buffer);

    await this.bot.sendVoice(chatId, audioFilePath);
    await this.notifier.collect(MessageType.AUDIO, audioFilePath);
    await deleteFile(audioFilePath);
  }

  async handleImageAnalyzerAction({ chatId, photo }: Partial<TelegramMessageData>): Promise<void> {
    const imageLocalPath = await this.bot.downloadFile(photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
    await this.notifier.collect(MessageType.PHOTO, imageLocalPath);

    const imgurToken = this.configService.get('IMGUR_CLIENT_ID');
    const imageUrl = await imgurUploadImage(imgurToken, imageLocalPath);
    const imageAnalysisText = await this.openaiService.analyzeImage(IMAGE_ANALYSIS_PROMPT, imageUrl);

    await sendShortenedMessage(this.bot, chatId, imageAnalysisText);
    await this.notifier.collect(MessageType.TEXT, imageAnalysisText);
    deleteFile(imageLocalPath);
  }
}
