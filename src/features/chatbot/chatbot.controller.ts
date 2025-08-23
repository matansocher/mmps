import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';

export class ChatRequestDTO {
  @ApiProperty({ description: 'The message to send to the chatbot', example: 'What is the weather like in New York?' })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  readonly message!: string;

  @ApiProperty({ description: 'User ID for conversation tracking', example: 'user-123' })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  readonly userId!: string;
}

@ApiTags('chatbot')
@Controller({ path: 'chatbot', version: '1' })
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @ApiBody({ type: ChatRequestDTO })
  @Post('chat')
  async chat(@Body() { message, userId }: ChatRequestDTO): Promise<string> {
    return this.chatbotService.processMessage(message, userId);
  }
}
