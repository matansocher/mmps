import axios from 'axios';
import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactRequestDTO, ContactResponseDTO } from './types';

export const telegramBaseUrl = 'https://api.telegram.org';

@Controller('define')
export class DefineController {
  private readonly logger = new Logger(DefineController.name);

  constructor(private readonly configService: ConfigService) {}

  @Post('contact')
  async contact(@Body() body: ContactRequestDTO): Promise<ContactResponseDTO> {
    try {
      const { email } = body;
      this.logger.log(`A new user contacted from the Define website`, `Email: ${email}`);
      const messageText = [`A new user contacted from the Define website`, `Email: ${email}`].join('\n');
      const telegramBotToken = this.configService.get('DEFINE_TELEGRAM_BOT_TOKEN');
      const telegramChatId = this.configService.get('DEFINE_TELEGRAM_CHAT_ID');
      const telegramApiUrl = `${telegramBaseUrl}/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${messageText}`;
      const result = await axios.get(telegramApiUrl);
      return { success: result.status === 200 };
    } catch (err) {
      this.logger.error(`Failed to send contact form, error: ${err}`);
      return { success: false };
    }
  }
}
