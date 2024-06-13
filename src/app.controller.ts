import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

interface BotStatus {
  status: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getBotStatus(): Promise<BotStatus> {
     return { status: 'Bot is running' };
  }
}
