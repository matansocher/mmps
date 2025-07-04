import { Response } from 'express';
import { join } from 'node:path';
import { twiml } from 'twilio';
import { Controller, Get, Logger, OnModuleInit, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { phoneCall, sendSMS } from '@services/twilio';

@Controller('caller')
export class CallerController implements OnModuleInit {
  private readonly logger = new Logger(CallerController.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    // sendSMS();
    // phoneCall();
  }

  @Get('audio')
  async audio(@Res() res: Response) {
    this.logger.log(`/audio callback endpoint hit by Twilio`);

    const filePath = join(process.cwd(), 'assets', 'recordings', 'audio.mp3');
    res.sendFile(filePath);
  }

  @Post('voice')
  handleVoice(@Res() res: Response) {
    this.logger.log(`/voice callback endpoint hit by Twilio`);

    const response = new twiml.VoiceResponse();
    response.play(`${this.configService.get('WEBHOOK_PROXY_URL')}/caller/audio`);

    res.type('text/xml');
    res.send(response.toString());
  }
}
