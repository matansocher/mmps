// import axios from 'axios';
// import validUrl from 'valid-url';
import { promises as fs } from 'fs';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MessageType, NotifierBotService } from '@core/notifier-bot';
import { VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo';
import { deleteFile, getErrorMessage, setFfmpegPath } from '@core/utils';
import { AiService } from '@services/ai';
import { GoogleTranslateService } from '@services/google-translate';
// import { ImgurService } from '@services/imgur';
// import { SocialMediaDownloaderService } from '@services/social-media-downloader';
import { BOTS, ITelegramMessageData, MessageLoaderOptions, MessageLoaderService, TelegramGeneralService, getMessageData } from '@services/telegram';
// import { YoutubeTranscriptService } from '@services/youtube-transcript';
import { IVoicePalOption } from './interface';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { ANALYTIC_EVENT_NAMES, ANALYTIC_EVENT_STATES, IMAGE_ANALYSIS_PROMPT, LOCAL_FILES_PATH, VOICE_PAL_OPTIONS } from './voice-pal.config';
import { getKeyboardOptions, validateActionWithMessage } from './utils';

@Injectable()
export class VoicePalService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly messageLoaderService: MessageLoaderService,
    private readonly mongoUserService: VoicePalMongoUserService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly googleTranslateService: GoogleTranslateService,
    // private readonly youtubeTranscriptService: YoutubeTranscriptService,
    // private readonly socialMediaDownloaderService: SocialMediaDownloaderService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    // private readonly imgurService: ImgurService,
    private readonly aiService: AiService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.VOICE_PAL.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): any {
    setFfmpegPath();
  }

  async handleActionSelection(
    message: Message,
    selection: string,
  ): Promise<void> {
    const { telegramUserId, chatId, firstName, lastName, username } =
      getMessageData(message);
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find(
      (option: string) => VOICE_PAL_OPTIONS[option].displayName === selection,
    );

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      this.mongoUserService.saveUserDetails({
        telegramUserId,
        chatId,
        firstName,
        lastName,
        username,
      });
      this.notifierBotService.notify(
        BOTS.VOICE_PAL.name,
        { action: ANALYTIC_EVENT_NAMES['/start'] },
        chatId,
        this.mongoUserService,
      );
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    await this.bot.sendMessage(
      chatId,
      replyText,
      getKeyboardOptions(),
    );
  }

  async handleAction(
    message: Message,
    userAction: IVoicePalOption,
  ): Promise<void> {
    const { chatId, text, audio, video, photo, file } = getMessageData(message);

    if (!userAction) {
      await this.bot.sendMessage(chatId, `Please select an action first.`);
      return;
    }

    const inputErrorMessage =
      validateActionWithMessage(userAction, { text, audio, video, photo, file });
    if (inputErrorMessage) {
      await this.bot.sendMessage(chatId, inputErrorMessage, getKeyboardOptions());
      return;
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[userAction.displayName];
    try {
      if (userAction && userAction.showLoader) {
        await this.messageLoaderService.handleMessageWithLoader(
          this.bot,
          chatId,
          {
            cycleDuration: 5000,
            loadingAction: userAction.loaderType,
          } as MessageLoaderOptions,
          async (): Promise<void> => {
            await this[userAction.handler]({
              chatId,
              text,
              audio,
              video,
              photo,
              file,
            });
          },
        );
      } else {
        await this[userAction.handler]({
          chatId,
          text,
          audio,
          video,
          photo,
          file,
        });
      }

      this.notifierBotService.notify(
        BOTS.VOICE_PAL.name,
        { handler: analyticAction, action: ANALYTIC_EVENT_STATES.FULFILLED },
        chatId,
        this.mongoUserService,
      );
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.handleAction.name, `error: ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.VOICE_PAL.name,
        {
          handler: analyticAction,
          action: ANALYTIC_EVENT_STATES.ERROR,
          error: errorMessage,
        },
        chatId,
        this.mongoUserService,
      );
      throw err;
    }
  }

  async handleTranscribeAction({
    chatId,
    video,
    audio,
  }: Partial<ITelegramMessageData>): Promise<void> {
    const { audioFileLocalPath, videoFileLocalPath } =
      await this.telegramGeneralService.downloadAudioFromVideoOrAudio(
        this.bot,
        { video, audio },
        LOCAL_FILES_PATH,
      );
    await this.notifierBotService.collect(
      videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO,
      videoFileLocalPath || audioFileLocalPath,
    );
    deleteFile(videoFileLocalPath);
    const resText =
      await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
    await this.bot.sendMessage(
      chatId,
      resText,
      getKeyboardOptions(),
    );
    await this.notifierBotService.collect(MessageType.TEXT, resText);
    await deleteFile(audioFileLocalPath);
  }

  async handleTranslateAction({
    chatId,
    text,
    video,
    audio,
  }: Partial<ITelegramMessageData>): Promise<void> {
    let resText = '';

    if (text) {
      await this.notifierBotService.collect(MessageType.TEXT, text);
      resText = await this.googleTranslateService.getTranslationToEnglish(text);
    } else {
      const { audioFileLocalPath, videoFileLocalPath } =
        await this.telegramGeneralService.downloadAudioFromVideoOrAudio(
          this.bot,
          { video, audio },
          LOCAL_FILES_PATH,
        );
      await this.notifierBotService.collect(
        videoFileLocalPath ? MessageType.VIDEO : MessageType.AUDIO,
        videoFileLocalPath || audioFileLocalPath,
      );
      deleteFile(videoFileLocalPath);
      resText =
        await this.aiService.getTranslationFromAudio(audioFileLocalPath);
      deleteFile(audioFileLocalPath);
    }

    await this.bot.sendMessage(
      chatId,
      resText,
      getKeyboardOptions(),
    );
    await this.notifierBotService.collect(MessageType.TEXT, resText);
  }

  async handleTextToSpeechAction({
    chatId,
    text,
  }: Partial<ITelegramMessageData>): Promise<void> {
    await this.notifierBotService.collect(MessageType.TEXT, text);
    const result = await this.aiService.getAudioFromText(text);

    const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
    const buffer = Buffer.from(await result.arrayBuffer());
    await fs.writeFile(audioFilePath, buffer);

    await this.bot.sendVoice(
      chatId,
      audioFilePath,
      getKeyboardOptions(),
    );
    await this.notifierBotService.collect(MessageType.AUDIO, audioFilePath);
    await deleteFile(audioFilePath);
  }

  // async handleSummarizeTextAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const textSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, text);
  //   await this.bot.sendMessage(chatId, textSummary, getKeyboardOptions());
  // }

  // async handleSummarizeSocialMediaVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   if (text.includes('youtube') || text.includes('youtu.be')) {
  //     return this.handleSummarizeYoutubeVideoAction({ chatId, text });
  //   } else if (text.includes('facebook') || text.includes('instagram')) {
  //     return this.handleSummarizeMetaVideoAction({ chatId, text });
  //   } else if (text.includes('tiktok')) {
  //     return this.handleSummarizeTiktokVideoAction({ chatId, text });
  //   } else {
  //     await this.bot.sendMessage(chatId, NOT_FOUND_VIDEO_MESSAGES.SOCIAL_MEDIA, getKeyboardOptions());
  //   }
  // }

  // async handleSummarizeYoutubeVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const videoId = this.youtubeTranscriptService.getYoutubeVideoIdFromUrl(text);
  //   if (!videoId) {
  //     await this.bot.sendMessage(chatId, NOT_FOUND_VIDEO_MESSAGES.YOUTUBE, getKeyboardOptions());
  //     return;
  //   }
  //   const { transcription, errorMessage } = await this.youtubeTranscriptService.getYoutubeVideoTranscription(videoId);
  //   if (errorMessage) {
  //     await this.bot.sendMessage(chatId, errorMessage, getKeyboardOptions());
  //     return;
  //   }
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.bot.sendMessage(chatId, summaryTranscription, getKeyboardOptions());
  // }

  // async handleSummarizeTiktokVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const audioBuffer = await this.socialMediaDownloaderService.getTiktokAudio(text);
  //   if (!audioBuffer) {
  //     await this.bot.sendMessage(chatId, NOT_FOUND_VIDEO_MESSAGES.TIKTOK, getKeyboardOptions());
  //     return;
  //   }
  //   const audioFilePath = `${LOCAL_FILES_PATH}/tiktok-audio-${new Date().getTime()}.mp3`;
  //   await fs.writeFile(audioFilePath, audioBuffer);
  //
  //   const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);
  //
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.bot.sendMessage(chatId, summaryTranscription, getKeyboardOptions());
  //   await deleteFile(audioFilePath);
  // }

  // async handleSummarizeMetaVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const videoBuffer = await this.socialMediaDownloaderService.getMetaVideo(text);
  //   const videoFilePath = `${LOCAL_FILES_PATH}/meta-video-${new Date().getTime()}.mp4`;
  //   await saveVideoBytesArray(videoBuffer, videoFilePath);
  //   const audioFilePath = await extractAudioFromVideo(videoFilePath);
  //   const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);
  //
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.bot.sendMessage(chatId, summaryTranscription, getKeyboardOptions());
  //   await deleteFile(videoFilePath);
  //   await deleteFile(audioFilePath);
  // }

  // async handleImageGenerationAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const imageUrl = await this.aiService.createImage(text);
  //   await bot.sendPhoto(chatId, imageUrl, getKeyboardOptions());
  // }

  async handleImageAnalyzerAction({
    chatId,
    photo,
  }: Partial<ITelegramMessageData>): Promise<void> {
    const imageLocalPath = await this.bot.downloadFile(
      photo[photo.length - 1].file_id,
      LOCAL_FILES_PATH,
    );
    await this.notifierBotService.collect(MessageType.PHOTO, imageLocalPath);
    const imageAnalysisText = await this.aiService.analyzeImage(
      IMAGE_ANALYSIS_PROMPT,
      imageLocalPath,
    );
    await this.bot.sendMessage(
      chatId,
      imageAnalysisText,
      getKeyboardOptions(),
    );
    await this.notifierBotService.collect(MessageType.TEXT, imageAnalysisText);
    deleteFile(imageLocalPath);
  }

  // async handleAnalyzeFile({ chatId, file }: Partial<ITelegramMessageData>): Promise<void> {
  //   const fileLocalPath = await this.telegramGeneralService.downloadFile(this.bot, file.file_id, LOCAL_FILES_PATH);
  //   const fileAnalysisText = await this.aiService.analyzeFile(FILE_ANALYSIS_PROMPT, fileLocalPath);
  //   await this.bot.sendMessage(chatId, fileAnalysisText, getKeyboardOptions());
  //   deleteFile(fileLocalPath);
  // }

  // async webPageSummary({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   if (!validUrl.isUri(text)) {
  //     await this.bot.sendMessage(chatId, WEB_PAGE_URL_INVALID, getKeyboardOptions());
  //     return;
  //   }
  //   const { data: webPageContent } = await axios.get(text);
  //   const SUMMARY_PROMPT =
  //     'You are a helpful assistant. You will be provided with a url to a web page from the user. ' +
  //     'Please summarize the page content. You can also split the summary into section, and add to each section its header.';
  //
  //   const webPageSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, webPageContent);
  //   await this.bot.sendMessage(chatId, webPageSummary, getKeyboardOptions());
  // }
}
