import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Body, Controller, Post } from '@nestjs/common';
import { ContactRequestDTO, ContactResponseDTO } from './types';

@Controller('define')
export class DefineController {
  constructor(private readonly configService: ConfigService) {}

  @Post('contact')
  protected async contact(@Body() body: ContactRequestDTO): Promise<ContactResponseDTO> {
    try {
      const { email } = body;
      console.log(`A new user contacted from the Define website`, `Email: ${email}`);
      const messageText = [`A new user contacted from the Define website`, `Email: ${email}`].join('\n');
      const telegramBotToken = this.configService.get('DEFINE_TELEGRAM_BOT_TOKEN');
      const telegramChatId = this.configService.get('DEFINE_TELEGRAM_CHAT_ID');
      const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${messageText}`;
      const result = await axios.get(telegramApiUrl);
      return { success: result.status === 200 };
    } catch (err) {
      console.error(`Failed to send contact form, error: ${err}`);
      return { success: false };
    }
  }
}
