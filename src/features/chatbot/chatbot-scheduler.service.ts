import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';
import { dailySummary, exerciseReminder, footballPredictions, footballUpdate, sportsCalendar, weeklyExerciseSummary } from './schedulers';

@Injectable()
export class ChatbotSchedulerService implements OnModuleInit {
  constructor(
    private readonly chatbotService: ChatbotService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailySummary(); // for testing purposes
      // this.handleFootballUpdate(); // for testing purposes
      // this.handleFootballPredictions(); // for testing purposes
      // this.handleSportsCalendar(); // for testing purposes
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
    }, 8000);
  }

  @Cron(`59 12,23 * * *`, { name: 'chatbot-football-update', timeZone: DEFAULT_TIMEZONE })
  async handleFootballUpdate(): Promise<void> {
    await footballUpdate(this.bot, this.chatbotService);
  }

  @Cron(`00 13 * * *`, { name: 'chatbot-football-predictions', timeZone: DEFAULT_TIMEZONE })
  async handleFootballPredictions(): Promise<void> {
    await footballPredictions(this.bot, this.chatbotService);
  }

  @Cron(`00 23 * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    await dailySummary(this.bot, this.chatbotService);
  }

  @Cron(`00 08 * * 0,3`, { name: 'chatbot-important-games-calendar', timeZone: DEFAULT_TIMEZONE })
  async handleSportsCalendar(): Promise<void> {
    await sportsCalendar(this.bot, this.chatbotService);
  }

  @Cron(`0 19 * * *`, { name: 'chatbot-exercise-reminder', timeZone: DEFAULT_TIMEZONE })
  async handleExerciseReminder(): Promise<void> {
    await exerciseReminder(this.bot, this.chatbotService);
  }

  @Cron(`0 22 * * 6`, { name: 'chatbot-weekly-exercise-summary', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklyExerciseSummary(): Promise<void> {
    await weeklyExerciseSummary(this.bot, this.chatbotService);
  }
}
