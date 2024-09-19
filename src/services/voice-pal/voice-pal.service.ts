import axios from 'axios';
import validUrl from 'valid-url';
import { promises as fs } from 'fs';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils/utils.service';
import { VoicePalMongoAnalyticLogService, VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo/services';
import { AiService } from '@services/ai/ai.service';
import { BOTS, ITelegramMessageData, MessageLoaderOptions, MessageLoaderService, TelegramGeneralService } from '@services/telegram';
import { GoogleTranslateService } from '@services/google-translate/google-translate.service';
import { IVoicePalOption } from '@services/voice-pal/interface';
import { ImgurService } from '@services/imgur/imgur.service';
import { SocialMediaDownloaderService } from '@services/social-media-downloader/social-media-downloader.service';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { YoutubeTranscriptService } from '@services/youtube-transcript/youtube-transcript.service';
import {
  ANALYTIC_EVENT_NAMES,
  ANALYTIC_EVENT_STATES,
  FILE_ANALYSIS_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  LOCAL_FILES_PATH,
  NOT_FOUND_VIDEO_MESSAGES,
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
    private readonly mongoAnalyticLogService: VoicePalMongoAnalyticLogService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly googleTranslateService: GoogleTranslateService,
    private readonly youtubeTranscriptService: YoutubeTranscriptService,
    private readonly socialMediaDownloaderService: SocialMediaDownloaderService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly imgurService: ImgurService,
    private readonly aiService: AiService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.VOICE_PAL.name) private readonly bot: TelegramBot,
  ) {}

  async handleActionSelection(message: Message, selection: string): Promise<void> {
    const { telegramUserId, chatId, firstName, lastName, username } = this.telegramGeneralService.getMessageData(message);
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find((option: string) => VOICE_PAL_OPTIONS[option].displayName === selection);

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      await this.mongoUserService.saveUserDetails({ telegramUserId, chatId, firstName, lastName, username });
      this.notifierBotService.notify(BOTS.VOICE_PAL.name, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    const analyticAction = `${ANALYTIC_EVENT_NAMES[selection]} - ${ANALYTIC_EVENT_STATES.SET_ACTION}`;
    this.notifierBotService.notify(BOTS.VOICE_PAL.name, { action: analyticAction }, chatId, this.mongoUserService);

    this.logger.info(this.handleActionSelection.name, `chatId: ${chatId}, selection: ${selection}`);

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
      this.notifierBotService.notify(BOTS.VOICE_PAL.name, { handler: analyticAction, action: ANALYTIC_EVENT_STATES.ERROR }, chatId, this.mongoUserService);
      throw err;
    }
  }

  async handleTranscribeAction({ chatId, video, audio }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const audioFileLocalPath = await this.telegramGeneralService.downloadAudioFromVideoOrAudio(this.bot, { video, audio }, LOCAL_FILES_PATH);
      const resText = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, this.voicePalUtilsService.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFileLocalPath);
    } catch (err) {
      this.logger.error(this.handleTranscribeAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleTranslateAction({ chatId, text, video, audio }: Partial<ITelegramMessageData>): Promise<void> {
    try {
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
    } catch (err) {
      this.logger.error(this.handleTranslateAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleTextToSpeechAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const result = await this.aiService.getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.telegramGeneralService.sendVoice(this.bot, chatId, audioFilePath, this.voicePalUtilsService.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleTextToSpeechAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeTextAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const textSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, text);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, textSummary, this.voicePalUtilsService.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleSummarizeTextAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeYoutubeVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const videoId = this.youtubeTranscriptService.getYoutubeVideoIdFromUrl(text);
      if (!videoId) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, NOT_FOUND_VIDEO_MESSAGES.YOUTUBE, this.voicePalUtilsService.getKeyboardOptions());
      }
      const { transcription, errorMessage } = await this.youtubeTranscriptService.getYoutubeVideoTranscription(videoId);
      if (errorMessage) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage, this.voicePalUtilsService.getKeyboardOptions());
      }
      const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleSummarizeYoutubeVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeTiktokVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const audioBuffer = await this.socialMediaDownloaderService.getTiktokAudio(text);
      if (!audioBuffer) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, NOT_FOUND_VIDEO_MESSAGES.TIKTOK, this.voicePalUtilsService.getKeyboardOptions());
      }
      const audioFilePath = `${LOCAL_FILES_PATH}/tiktok-audio-${new Date().getTime()}.mp3`;
      await fs.writeFile(audioFilePath, audioBuffer);

      const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);

      const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleSummarizeTiktokVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeMetaVideoAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const videoBuffer = await this.socialMediaDownloaderService.getMetaVideo(text);
      const videoFilePath = `${LOCAL_FILES_PATH}/meta-video-${new Date().getTime()}.mp4`;
      await this.utilsService.saveVideoBytesArray(videoBuffer, videoFilePath);
      const audioFilePath = await this.utilsService.extractAudioFromVideo(videoFilePath);
      const transcription = await this.aiService.getTranscriptFromAudio(audioFilePath);

      const summaryTranscription = await this.aiService.getChatCompletion(SUMMARY_PROMPT, transcription);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryTranscription, this.voicePalUtilsService.getKeyboardOptions());
      await this.utilsService.deleteFile(videoFilePath);
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleSummarizeMetaVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleImageGenerationAction({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const imageUrl = await this.aiService.createImage(text);
      await this.telegramGeneralService.sendPhoto(this.bot, chatId, imageUrl, this.voicePalUtilsService.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleImageGenerationAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleImageAnalyzerAction({ chatId, photo }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const imageLocalPath = await this.telegramGeneralService.downloadFile(this.bot, photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageAnalysisText = await this.aiService.analyzeImage(IMAGE_ANALYSIS_PROMPT, imageLocalPath);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, imageAnalysisText, this.voicePalUtilsService.getKeyboardOptions());
      this.utilsService.deleteFile(imageLocalPath);
    } catch (err) {
      this.logger.error(this.handleImageAnalyzerAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleAnalyzerFile({ chatId, file }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const fileLocalPath = await this.telegramGeneralService.downloadFile(this.bot, file.file_id, LOCAL_FILES_PATH);
      const fileAnalysisText = await this.aiService.analyzeFile(FILE_ANALYSIS_PROMPT, fileLocalPath);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, fileAnalysisText, this.voicePalUtilsService.getKeyboardOptions());
      this.utilsService.deleteFile(fileLocalPath);
    } catch (err) {
      this.logger.error(this.handleAnalyzerFile.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async webPageSummary({ chatId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      if (!validUrl.isUri(text)) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, WEB_PAGE_URL_INVALID, this.voicePalUtilsService.getKeyboardOptions());
      }
      const { data: webPageContent } = await axios.get(text);
      const SUMMARY_PROMPT =
        'You are a helpful assistant. You will be provided with a url to a web page from the user. ' +
        'Please summarize the page content. You can also split the summary into section, and add to each section its header.';

      const webPageSummary = await this.aiService.getChatCompletion(SUMMARY_PROMPT, webPageContent);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, webPageSummary, this.voicePalUtilsService.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.webPageSummary.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
