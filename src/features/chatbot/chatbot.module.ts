import { Module, OnModuleInit } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { newsTool } from './tools/news';
import { registerTool } from './tools/tool-registry';
import { weatherTool } from './tools/weather';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule implements OnModuleInit {
  onModuleInit() {
    // Register tools for backward compatibility with the tool registry
    registerTool(weatherTool);
    registerTool(newsTool);
  }
}
