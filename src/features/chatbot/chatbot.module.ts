import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { connectGithubMcp } from '@shared/ai';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { DB_NAME as COKE_DB_NAME } from '@shared/coke-quit';
import { DB_NAME as COOKER_DB_NAME } from '@shared/cooker';
import { DB_NAME as REMINDERS_DB_NAME } from '@shared/reminders';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  providers: [ChatbotController, ChatbotSchedulerService, ChatbotService],
})
export class ChatbotModule implements OnModuleInit {
  async onModuleInit() {
    const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME, COKE_DB_NAME, COOKER_DB_NAME, WOLT_DB_NAME, WORLDLY_DB_NAME, REMINDERS_DB_NAME];
    await Promise.all([
      ...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName)),
      await connectGithubMcp().catch((err) => {
        console.error(`[ChatbotModule] Failed to connect to GitHub MCP: ${err}`);
      }),
    ]);
  }
}
