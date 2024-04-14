import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly AI: OpenaiService,
    private readonly AssistAI: OpenaiAssistantService,
    private readonly task: GoogleTasksApiService,
  ) {}

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.startBot();
    
    
  }
}