// import type TelegramBot from 'node-telegram-bot-api';
// import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { DEFAULT_TIMEZONE } from '@core/config';
// import { NotifierService } from '@core/notifier';
// import { getStockDetailsBySymbol } from '@services/alpha-vantage';
// import { getNews } from '@services/news-api';
// import { getCurrentWeather } from '@services/open-weather-map';
// import { getCompetitionMatches } from '@services/scores-365';
// import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
// import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './chatbot.config';
//
// const MORNING_SUMMARY_HOUR = 8; // 8 AM
//
// @Injectable()
// export class ChatbotSchedulerService implements OnModuleInit {
//   constructor(
//     private readonly notifier: NotifierService,
//     @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
//   ) {}
//
//   onModuleInit(): void {
//     // this.handleMorningSummary(); // for testing purposes
//   }
//
//   @Cron(`0 ${MORNING_SUMMARY_HOUR} * * *`, { name: 'chatbot-morning-summary', timeZone: DEFAULT_TIMEZONE })
//   async handleMorningSummary(): Promise<void> {
//     try {
//         try {
//           const summaryMessage = await this.generateMorningSummary(subscription);
//           if (!summaryMessage) {
//             continue;
//           }
//
//           const greeting = this.getGreeting();
//           const fullMessage = `${greeting}\n\n${summaryMessage}`;
//
//           await sendShortenedMessage(this.bot, subscription.chatId, fullMessage, { parse_mode: 'Markdown' });
//         } catch (err) {
//           const userDetails = await this.userDB.getUserDetails({ chatId: subscription.chatId });
//           if (err.message.includes(BLOCKED_ERROR)) {
//             await this.subscriptionDB.updateSubscription(subscription.chatId, { isActive: false });
//             this.notifier.notify(BOT_CONFIG, {
//               action: ANALYTIC_EVENT_NAMES.ERROR,
//               userDetails,
//               error: BLOCKED_ERROR,
//             });
//           } else {
//             this.notifier.notify(BOT_CONFIG, {
//               action: `morning-summary - ${ANALYTIC_EVENT_NAMES.ERROR}`,
//               userDetails,
//               error: err,
//             });
//           }
//         }
//     } catch (err) {
//       this.notifier.notify(BOT_CONFIG, {
//         action: `morning-summary - ${ANALYTIC_EVENT_NAMES.ERROR}`,
//         error: err,
//       });
//     }
//   }
//
//   private async generateMorningSummary(subscription: any): Promise<string> {
//     const sections: string[] = [];
//     const preferences = subscription.preferences || {};
//
//     // Weather Summary
//     if (preferences.weather !== false) {
//       try {
//         const weather = await getCurrentWeather('Tel Aviv'); // Default location, could be configurable
//         sections.push(`🌤️ **Weather in Tel Aviv**\n${weather.description}, ${weather.temperature}°C (feels like ${weather.feelsLike}°C)`);
//       } catch (error) {
//         console.error('Failed to fetch weather:', error);
//       }
//     }
//
//     // Stock Market Summary
//     if (preferences.stocks !== false) {
//       try {
//         const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA']; // Popular stocks
//         const stockPromises = stockSymbols.map(async (symbol) => {
//           try {
//             const stock = await getStockDetailsBySymbol(symbol);
//             const changePercent = stock.changePercent ? parseFloat(stock.changePercent) : 0;
//             const changeIcon = changePercent >= 0 ? '📈' : '📉';
//             return `${changeIcon} ${symbol}: $${stock.price} (${stock.changePercent}%)`;
//           } catch {
//             return null;
//           }
//         });
//
//         const stockResults = (await Promise.all(stockPromises)).filter(Boolean);
//         if (stockResults.length > 0) {
//           sections.push(`📊 **Stock Market**\n${stockResults.join('\n')}`);
//         }
//       } catch (error) {
//         console.error('Failed to fetch stocks:', error);
//       }
//     }
//
//     // Sports Summary
//     if (preferences.sports !== false) {
//       try {
//         const competitionDetails = await getCompetitionMatches(47); // Premier League ID
//         if (competitionDetails?.matches?.length > 0) {
//           const todayMatches = competitionDetails.matches
//             .slice(0, 3)
//             .map((match) => `⚽ ${match.homeCompetitor?.name || 'TBD'} vs ${match.awayCompetitor?.name || 'TBD'} - ${match.startTime || 'TBD'}`);
//           if (todayMatches.length > 0) {
//             sections.push(`⚽ **Today's Matches**\n${todayMatches.join('\n')}`);
//           }
//         }
//       } catch (error) {
//         console.error('Failed to fetch sports:', error);
//       }
//     }
//
//     // News Summary
//     if (preferences.news !== false) {
//       try {
//         const news = await getNews('us', 'technology', 3); // Get top 3 tech news
//         if (news?.length > 0) {
//           const newsItems = news.slice(0, 2).map((article) => `📰 ${article.title}`);
//           sections.push(`📰 **Top News**\n${newsItems.join('\n')}`);
//         }
//       } catch (error) {
//         console.error('Failed to fetch news:', error);
//       }
//     }
//
//     // Available Tools Summary
//     sections.push(`🤖 **Available Tools**\nI can help you with:\n• Weather forecasts\n• Stock prices\n• Sports updates\n• News\n• Image generation\n• Audio transcription\n• And much more!`);
//
//     return sections.join('\n\n');
//   }
//
//   private getGreeting(): string {
//     const greetings = [
//       "🌅 Good morning! Here's your daily summary:",
//       '☀️ Rise and shine! Your morning briefing is ready:',
//       "🌄 Good morning! Here's what's happening today:",
//       '🌞 Morning! Your daily digest:',
//       '🌅 Hello! Starting your day with the latest updates:',
//     ];
//
//     return greetings[Math.floor(Math.random() * greetings.length)];
//   }
// }
