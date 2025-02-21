import { promises as fs } from 'fs';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo';
import { MessageType, NotifierBotService } from '@core/notifier-bot';
import { deleteFile, getErrorMessage, setFfmpegPath } from '@core/utils';
import { AiService } from '@services/ai';
import { getTranslationToEnglish } from '@services/google-translate';
import {
  BOT_BROADCAST_ACTIONS,
  BOTS,
  downloadAudioFromVideoOrAudio,
  getMessageData,
  MessageLoader,
  sendShortenedMessage,
  TelegramMessageData,
} from '@services/telegram';
import { VoicePalOption } from './interface';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { getKeyboardOptions, validateActionWithMessage } from './utils';
import { ANALYTIC_EVENT_NAMES, ANALYTIC_EVENT_STATES, IMAGE_ANALYSIS_PROMPT, VOICE_PAL_OPTIONS } from './voice-pal.config';

@Injectable()
export class VoicePalService implements OnModuleInit {
  private readonly logger = new Logger(VoicePalService.name);

  constructor(
    private readonly mongoUserService: VoicePalMongoUserService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly aiService: AiService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.VOICE_PAL.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): any {
    setFfmpegPath();
  }

  async handleActionSelection(message: Message, selection: string): Promise<void> {
    const { telegramUserId, chatId, firstName, lastName, username } = getMessageData(message);
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find((option: string) => VOICE_PAL_OPTIONS[option].displayName === selection);

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      await this.mongoUserService.saveUserDetails({ telegramUserId, chatId, firstName, lastName, username });
      this.notifierBotService.notify(BOTS.VOICE_PAL, { action: ANALYTIC_EVENT_NAMES['/start'] }, chatId, this.mongoUserService);
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    await this.bot.sendMessage(chatId, replyText, getKeyboardOptions());
  }

  async handleAction(message: Message, userAction: VoicePalOption): Promise<void> {
    const { chatId, text, audio, video, photo, file } = getMessageData(message);

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
        const messageLoaderService = new MessageLoader(this.bot, chatId, {
          cycleDuration: 3000,
          loadingAction: userAction.loaderType || BOT_BROADCAST_ACTIONS.TYPING,
          loaderEmoji: '🤔',
        });
        await messageLoaderService.handleMessageWithLoader(async (): Promise<void> => {
          await this[userAction.handler]({ chatId, text, audio, video, photo, file });
        });
      } else {
        await this[userAction.handler]({ chatId, text, audio, video, photo, file });
      }

      this.notifierBotService.notify(BOTS.VOICE_PAL, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.FULFILLED }, chatId, this.mongoUserService);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleAction.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.VOICE_PAL,
        { handler: analyticAction, action: ANALYTIC_EVENT_STATES.ERROR, error: errorMessage },
        chatId,
        this.mongoUserService,
      );
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
    await this.notifierBotService.collect(videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO, videoFileLocalPath || audioFileLocalPath);
    deleteFile(videoFileLocalPath);
    const replyText = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
    await sendShortenedMessage(this.bot, chatId, replyText);
    await this.notifierBotService.collect(MessageType.TEXT, replyText);
    await deleteFile(audioFileLocalPath);
  }

  async handleTranslateAction({ chatId, text, video, audio }: Partial<TelegramMessageData>): Promise<void> {
    let replyText = '';

    if (text) {
      await this.notifierBotService.collect(MessageType.TEXT, text);
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
      await this.notifierBotService.collect(videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO, videoFileLocalPath || audioFileLocalPath);
      deleteFile(videoFileLocalPath);
      replyText = await this.aiService.getTranslationFromAudio(audioFileLocalPath);
      deleteFile(audioFileLocalPath);
    }

    await sendShortenedMessage(this.bot, chatId, replyText);
    await this.notifierBotService.collect(MessageType.TEXT, replyText);
  }

  async handleTextToSpeechAction({ chatId, text }: Partial<TelegramMessageData>): Promise<void> {
    await this.notifierBotService.collect(MessageType.TEXT, text);
    const result = await this.aiService.getAudioFromText(text);

    const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
    const buffer = Buffer.from(await result.arrayBuffer());
    await fs.writeFile(audioFilePath, buffer);

    await this.bot.sendVoice(chatId, audioFilePath);
    await this.notifierBotService.collect(MessageType.AUDIO, audioFilePath);
    await deleteFile(audioFilePath);
  }

  async handleImageAnalyzerAction({ chatId, photo }: Partial<TelegramMessageData>): Promise<void> {
    const imageLocalPath = await this.bot.downloadFile(photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
    await this.notifierBotService.collect(MessageType.PHOTO, imageLocalPath);
    const imageAnalysisText = await this.aiService.analyzeImage(IMAGE_ANALYSIS_PROMPT, imageLocalPath);
    await sendShortenedMessage(this.bot, chatId, imageAnalysisText);
    await this.notifierBotService.collect(MessageType.TEXT, imageAnalysisText);
    deleteFile(imageLocalPath);
  }
}
