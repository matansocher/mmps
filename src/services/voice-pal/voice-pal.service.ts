// import axios from 'axios';
// import validUrl from 'valid-url';
import { promises as fs } from 'fs';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import { VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo';
import { AiService } from '@services/ai';
import { GoogleTranslateService } from '@services/google-translate';
// import { ImgurService } from '@services/imgur';
// import { SocialMediaDownloaderService } from '@services/social-media-downloader';
import { BOTS, ITelegramMessageData, MessageLoaderOptions, MessageLoaderService, TelegramGeneralService } from '@services/telegram';
// import { YoutubeTranscriptService } from '@services/youtube-transcript';
import { IVoicePalOption } from './interface';
import { UserSelectedActionsService } from './user-selected-actions.service';
import {
  ANALYTIC_EVENT_NAMES,
  ANALYTIC_EVENT_STATES,
  FILE_ANALYSIS_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  LOCAL_FILES_PATH,
  // NOT_FOUND_VIDEO_MESSAGES,
  SUMMARY_PROMPT,
  VOICE_PAL_OPTIONS,
  WEB_PAGE_URL_INVALID,
} from './voice-pal.config';
import { VoicePalUtilsService } from './voice-pal-utils.service';

@Injectable()
export class VoicePalService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly messageLoaderService: MessageLoaderService,
    private readonly voicePalUtilsService: VoicePalUtilsService,
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

  async handleActionSelection(message: Message, selection: string): Promise<void> {
    const { telegramUserId, chatId, firstName, lastName, username } = this.telegramGeneralService.getMessageData(message);
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find((option: string) => VOICE_PAL_OPTIONS[option].displayName === selection);

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      this.mongoUserService.saveUserDetails({ telegramUserId, chatId, firstName, lastName, username });
      this.notifierBotService.notify(BOTS.VOICE_PAL.name, { action: ANALYTIC_EVENT_NAMES['/start'] }, chatId, this.mongoUserService);
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.voicePalUtilsService.getKeyboardOptions());
  }

  async handleAction(message: Message, userAction: IVoicePalOption): Promise<void> {
    const { chatId, text, audio, video, photo, file } = this.telegramGeneralService.getMessageData(message);

    if (!userAction) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Please select an action first.`);
      return;
    }

    const inputErrorMessage = this.voicePalUtilsService.validateActionWithMessage(userAction, { text, audio, video, photo, file });
    if (inputErrorMessage) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, inputErrorMessage, this.voicePalUtilsService.getKeyboardOptions());
      return;
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[userAction.displayName];
    try {
      if (userAction && userAction.showLoader) {
        await this.messageLoaderService.handleMessageWithLoader(
          this.bot,
          chatId,
          { cycleDuration: 5000, loadingAction: userAction.loaderType } as MessageLoaderOptions,
          async (): Promise<void> => {
            await this[userAction.handler]({ chatId, text, audio, video, photo, file });
          },
        );
      } else {
        await this[userAction.handler]({ chatId, text, audio, video, photo, file });
      }

      this.notifierBotService.notify(BOTS.VOICE_PAL.name, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.FULFILLED }, chatId, this.mongoUserService);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.handleAction.name, `error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.VOICE_PAL.name, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.ERROR, error: errorMessage }, chatId, this.mongoUserService);
      throw err;
    }
  }

  async handleTranscribeAction({ chatId, video, audio }: Partial<ITelegramMessageData>): Promise<void> {
    const audioFileLocalPath = await this.telegramGeneralService.downloadAudioFromVideoOrAudio(this.bot, { video, audio }, LOCAL_FILES_PATH);
    const resText = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
    await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, this.voicePalUtilsService.getKeyboardOptions());
    await this.utilsService.deleteFile(audioFileLocalPath);
  }

  async handleTranslateAction({ chatId, text, video, audio }: Partial<ITelegramMessageData>): Promise<void> {
    let resText = '';
    let audioFileLocalPath = '';

    if (text) {
      resText = await this.googleTranslateService.getTranslationToEnglish(text);
    } else {
      audioFileLocalPath = await this.telegramGeneralService.downloadAudioFromVideoOrAudio(this.bot, { video, audio }, LOCAL_FILES_PATH);
      resText = await this.aiService.getTranslationFromAudio(audioFileLocalPath);
      this.utilsService.deleteFile(audioFileLocalPath);
    }

    await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, this.voicePalUtilsService.getKeyboardOptions());
  }

  async handleTextToSpeechAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    const result = await this.aiService.getAudioFromText(text);

    const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
    const buffer = Buffer.from(await result.arrayBuffer());
    await fs.writeFile(audioFilePath, buffer);

    await this.telegramGeneralService.sendVoice(this.bot, chatId, audioFilePath, this.voicePalUtilsService.getKeyboardOptions());
    await this.utilsService.deleteFile(audioFilePath);
  }

  // async handleSummarizeTextAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const textSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, text);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, textSummary, this.voicePalUtilsService.getKeyboardOptions());
  // }

  // async handleSummarizeSocialMediaVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   if (text.includes('youtube') || text.includes('youtu.be')) {
  //     return this.handleSummarizeYoutubeVideoAction({ chatId, text });
  //   } else if (text.includes('facebook') || text.includes('instagram')) {
  //     return this.handleSummarizeMetaVideoAction({ chatId, text });
  //   } else if (text.includes('tiktok')) {
  //     return this.handleSummarizeTiktokVideoAction({ chatId, text });
  //   } else {
  //     await this.telegramGeneralService.sendMessage(this.bot, chatId, NOT_FOUND_VIDEO_MESSAGES.SOCIAL_MEDIA, this.voicePalUtilsService.getKeyboardOptions());
  //   }
  // }

  // async handleSummarizeYoutubeVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const videoId = this.youtubeTranscriptService.getYoutubeVideoIdFromUrl(text);
  //   if (!videoId) {
  //     await this.telegramGeneralService.sendMessage(this.bot, chatId, NOT_FOUND_VIDEO_MESSAGES.YOUTUBE, this.voicePalUtilsService.getKeyboardOptions());
  //     return;
  //   }
  //   const { transcription, errorMessage } = await this.youtubeTranscriptService.getYoutubeVideoTranscription(videoId);
  //   if (errorMessage) {
  //     await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage, this.voicePalUtilsService.getKeyboardOptions());
  //     return;
  //   }
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
  // }

  // async handleSummarizeTiktokVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const audioBuffer = await this.socialMediaDownloaderService.getTiktokAudio(text);
  //   if (!audioBuffer) {
  //     await this.telegramGeneralService.sendMessage(this.bot, chatId, NOT_FOUND_VIDEO_MESSAGES.TIKTOK, this.voicePalUtilsService.getKeyboardOptions());
  //     return;
  //   }
  //   const audioFilePath = `${LOCAL_FILES_PATH}/tiktok-audio-${new Date().getTime()}.mp3`;
  //   await fs.writeFile(audioFilePath, audioBuffer);
  //
  //   const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);
  //
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
  //   await this.utilsService.deleteFile(audioFilePath);
  // }

  // async handleSummarizeMetaVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const videoBuffer = await this.socialMediaDownloaderService.getMetaVideo(text);
  //   const videoFilePath = `${LOCAL_FILES_PATH}/meta-video-${new Date().getTime()}.mp4`;
  //   await this.utilsService.saveVideoBytesArray(videoBuffer, videoFilePath);
  //   const audioFilePath = await this.utilsService.extractAudioFromVideo(videoFilePath);
  //   const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);
  //
  //   const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
  //   await this.utilsService.deleteFile(videoFilePath);
  //   await this.utilsService.deleteFile(audioFilePath);
  // }

  // async handleImageGenerationAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   const imageUrl = await this.aiService.createImage(text);
  //   await this.telegramGeneralService.sendPhoto(this.bot, chatId, imageUrl, this.voicePalUtilsService.getKeyboardOptions());
  // }

  async handleImageAnalyzerAction({ chatId, photo }: Partial<ITelegramMessageData>): Promise<void> {
    const imageLocalPath = await this.telegramGeneralService.downloadFile(this.bot, photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
    const imageAnalysisText = await this.aiService.analyzeImage(IMAGE_ANALYSIS_PROMPT, imageLocalPath);
    await this.telegramGeneralService.sendMessage(this.bot, chatId, imageAnalysisText, this.voicePalUtilsService.getKeyboardOptions());
    this.utilsService.deleteFile(imageLocalPath);
  }

  // async handleAnalyzeFile({ chatId, file }: Partial<ITelegramMessageData>): Promise<void> {
  //   const fileLocalPath = await this.telegramGeneralService.downloadFile(this.bot, file.file_id, LOCAL_FILES_PATH);
  //   const fileAnalysisText = await this.aiService.analyzeFile(FILE_ANALYSIS_PROMPT, fileLocalPath);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, fileAnalysisText, this.voicePalUtilsService.getKeyboardOptions());
  //   this.utilsService.deleteFile(fileLocalPath);
  // }

  // async webPageSummary({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
  //   if (!validUrl.isUri(text)) {
  //     await this.telegramGeneralService.sendMessage(this.bot, chatId, WEB_PAGE_URL_INVALID, this.voicePalUtilsService.getKeyboardOptions());
  //     return;
  //   }
  //   const { data: webPageContent } = await axios.get(text);
  //   const SUMMARY_PROMPT =
  //     'You are a helpful assistant. You will be provided with a url to a web page from the user. ' +
  //     'Please summarize the page content. You can also split the summary into section, and add to each section its header.';
  //
  //   const webPageSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, webPageContent);
  //   await this.telegramGeneralService.sendMessage(this.bot, chatId, webPageSummary, this.voicePalUtilsService.getKeyboardOptions());
  // }
}
