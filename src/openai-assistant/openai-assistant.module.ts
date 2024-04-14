import { Module } from '@nestjs/common';

import { OpenaiAssistantController } from './openai-assistant.controller';
import { OpenaiAssistantService } from './openai-assistant.service';
import { LoggerService } from 'src/services/logger/logger.service';

const loggerServiceProvider = {
  provide: LoggerService,
  useValue: new LoggerService('tasks-api'),
};

@Module({
  controllers: [OpenaiAssistantController],
  providers: [OpenaiAssistantService, loggerServiceProvider],
})
export class OpenaiAssistantModule {}
