import axios from 'axios';
import { env } from 'node:process';
import { Body, Controller, Post } from '@nestjs/common';
import { ContactRequestDTO, ContactResponseDTO } from './types';

@Controller('define')
export class DefineController {
  @Post('contact')
  protected async contact(@Body() body: ContactRequestDTO): Promise<ContactResponseDTO> {
    try {
      const { email } = body;
      console.log(`A new user contacted from the Define website`, `Email: ${email}`);
      const messageText = [`A new user contacted from the Define website`, `Email: ${email}`].join('\n');
      const telegramApiUrl = `https://api.telegram.org/bot${env.DEFINE_TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${env.DEFINE_TELEGRAM_CHAT_ID}&text=${messageText}`;
      const result = await axios.get(telegramApiUrl);
      return { success: result.status === 200 };
    } catch (err) {
      console.error(`Failed to send contact form, error: ${err}`);
      return { success: false };
    }
  }
}
