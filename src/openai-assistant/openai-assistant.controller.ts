import { Controller } from '@nestjs/common';
import { OpenaiAssistantService } from './openai-assistant.service';

@Controller('openai-assistant')
export class OpenaiAssistantController {
  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
  ) {}
}
