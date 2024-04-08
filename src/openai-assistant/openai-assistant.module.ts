import { Module } from '@nestjs/common';

import { OpenaiAssistantController } from './openai-assistant.controller';
import { OpenaiAssistantService } from './openai-assistant.service';

@Module({
  controllers: [OpenaiAssistantController],
  providers: [OpenaiAssistantService],
})
export class OpenaiAssistantModule {}
