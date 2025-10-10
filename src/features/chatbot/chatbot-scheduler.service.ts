import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayExercise } from '@shared/trainer/mongo';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

// const TIKTOK_SUMMARY_PROMPT = 'You are a helpful assistant that summarizes TikTok video transcripts into concise summaries that capture the main points and essence of the video.';
//
// export const VideoSummarySchema = z.object({
//   summary: z.string().max(4095).describe('A comprehensive summary of the video transcript, covering the main points and concepts learned'),
//   description: z.string().max(200).describe('A short description of the video content, suitable for use as a caption or brief overview.'),
// });

@Injectable()
export class ChatbotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotSchedulerService.name);

  constructor(
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
    private readonly chatbotService: ChatbotService,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailySummary(); // for testing purposes
      // this.handleFootballUpdate(); // for testing purposes
      // this.handleFootballPredictions(); // for testing purposes
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
      // this.handleTikTokDigest(); // for testing purposes
    }, 8000);
  }

  @Cron(`59 12,23 * * *`, { name: 'chatbot-football-update', timeZone: DEFAULT_TIMEZONE })
  async handleFootballUpdate(): Promise<void> {
    try {
      const prompt = `Generate a midday football update for today (${getDateString()}).
          Use the match_summary tool to get today's match results and ongoing matches. 
          Format the message as:
          - Start with "⚽ המצב הנוכחי של משחקי היום:"
          - Include all matches (completed, ongoing, and upcoming)
          - Use the formatted text from the tool as it contains proper markdown
          - Keep it concise and informative
          - If no matches are found, say "אין משחקים היום"`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send football update: ${err}`);
    }
  }

  @Cron(`00 13 * * *`, { name: 'chatbot-football-predictions', timeZone: DEFAULT_TIMEZONE })
  async handleFootballPredictions(): Promise<void> {
    try {
      const todayDate = getDateString();

      const prompt = `Generate a morning football update with predictions for today (${todayDate}).

1. First, use the top_matches_for_prediction tool to get ALL upcoming matches for today.
   IMPORTANT: The tool now returns ALL matches with league table information where available.

2. Analyze ALL the matches and decide which ones are truly important based on:
   - League prestige (Champions League, Premier League, La Liga, Bundesliga, Serie A, etc.)
   - Team positions in standings (top teams playing, title races)
   - Close matches in the table (teams near each other in standings)
   - Points differences (teams competing for same positions)
   - Relegation battles
   - Derby matches or local rivalries

3. Select the most important matches (typically 3-6 matches, but can be more or less depending on the day).

4. For EACH important match you selected, use the match_prediction_data tool to get prediction data.

5. Analyze the data and provide match predictions with:
   - Home Win / Draw / Away Win percentages (must sum to 100%)
   - **Betting Odds**: Display the actual betting odds from the data (Home / Draw / Away)
   - Brief reasoning (2-3 sentences max per match)
   - Consider betting odds (very valuable!), recent form, and key statistics

Format the message as:
- If important matches found:
  * Start with "⚽ משחקי היום וניבויים:"
  * For each match:
    - Match info: Competition, teams, time
    - Betting Odds: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ (show the actual odds from the data)
    - Predictions: 🏠 X% | 🤝 Y% | 🚌 Z%
    - Brief analysis (2-3 sentences)
- If no important matches found:
  * Say "אין משחקים חשובים במיוחד היום 🤷‍♂️"
  * You can add a friendly note like "נהנה מהיום!" or similar

Keep it concise and in Hebrew`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send football update: ${err}`);
    }
  }

  @Cron(`00 23 * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]}) - format as a single line with only the important data (temperature range, rain chance, general conditions).
2. **Calendar**: Check my calendar events for tomorrow. Format as:
   - List each event (just the name and time)
   - If no events, write "- no events"
3. **Stock Market**: Show the top 7 companies (e.g., Apple, Amazon, Tesla, Meta, Nvidia, Microsoft, Google) with their current stock values and daily change percentage.
4. **Crypto**: Show current Bitcoin and Ethereum values with daily change percentage.
5. **Exercises**: Mention if I exercised today or not. If I did, congratulate me and provide a fun motivational message. If I didn't, encourage me to exercise tomorrow with a motivational message.
6. **Fun Fact**: End with a fun fact related to todays date or if no something interesting, just a random fun fact.

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a short warm greeting like "🌙 Good night!" and end with a message encouraging me to prepare for tomorrow's challenges.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await this.bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
      this.logger.error(`Failed to generate/send daily summary: ${err}`);
    }
  }

  @Cron(`0 19 * * *`, { name: 'chatbot-exercise-reminder', timeZone: DEFAULT_TIMEZONE })
  async handleExerciseReminder(): Promise<void> {
    try {
      const todayExercise = await getTodayExercise(MY_USER_ID);
      if (todayExercise) {
        return;
      }

      const prompt = `Generate a motivational exercise reminder for me. I haven't exercised today yet. 
      Use the exercise_analytics tool with action "generate_reminder" to get a motivational meme if available.
      Keep the message short, fun, and encouraging. Use emojis to make it engaging.
      If a meme URL is available, send it along with a short motivational message.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await this.bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send exercise reminder: ${err}`);
    }
  }

  @Cron(`0 22 * * 6`, { name: 'chatbot-weekly-exercise-summary', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklyExerciseSummary(): Promise<void> {
    try {
      const prompt = `Generate my weekly exercise summary.
      Use the exercise_analytics tool with action "weekly_summary" to get my weekly stats.
      Format the response with:
      - Last week's exercise days (show which days I exercised)
      - Weekly rating with stars
      - Current streak and longest streak
      - Encouraging message for the upcoming week
      Use emojis to make it engaging and motivational.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await this.bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send weekly exercise summary: ${err}`);
    }
  }

  // @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'chatbot-tiktok-digest', timeZone: DEFAULT_TIMEZONE })
  // async handleTikTokDigest(): Promise<void> {
  //   try {
  //     const channels = await getFollowedChannels();
  //     if (!channels.length) {
  //       return;
  //     }
  //
  //     for (const channel of channels) {
  //       await this.processTikTokChannel(channel);
  //       await sleep(1000);
  //     }
  //   } catch (err) {
  //     this.logger.error(`Failed to handle TikTok digest: ${err}`);
  //   }
  // }
  //
  // private async processTikTokChannel(channel: { username: string }): Promise<void> {
  //   try {
  //     const videos = await getTikTokUserVideos(channel.username);
  //     const todayVideos = videos.filter((video) => video.uploadDate === new Date().toISOString().split('T')[0]);
  //     const viewedVideos = await getVideos();
  //     const newVideos = todayVideos.filter((video) => !viewedVideos.find((v) => v.videoId === video.id));
  //
  //     if (!newVideos.length) {
  //       return;
  //     }
  //
  //     for (const video of newVideos) {
  //       await this.processTikTokVideo(channel.username, video);
  //     }
  //   } catch (err) {
  //     this.logger.error(`Failed to process TikTok channel ${channel.username}: ${err}`);
  //   }
  // }
  //
  // private async processTikTokVideo(username: string, video: { id: string; url?: string }): Promise<void> {
  //   try {
  //     const videoUrl = `https://www.tiktok.com/@${username}/video/${video.id}`;
  //     const videoTranscript = await getTikTokTranscript(username, video.id);
  //
  //     const { result: summaryDetails } = await getResponse<typeof VideoSummarySchema>({
  //       instructions: TIKTOK_SUMMARY_PROMPT,
  //       input: `Please Summarize this video text: ${videoTranscript.text}`,
  //       schema: VideoSummarySchema,
  //     });
  //
  //     const message = [`🎬 New TikTok video from @${username}`, `🔗 ${videoUrl}`, '', `📝 **${summaryDetails.description}**`, '', `📖 **Summary:**`, summaryDetails.summary].join('\n');
  //
  //     await this.bot.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });
  //     await addVideo(video.id);
  //   } catch (err) {
  //     this.logger.error(`Failed to process TikTok video ${video.id} from ${username}: ${err}`);
  //   }
  // }
}
