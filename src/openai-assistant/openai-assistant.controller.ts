import { Body, Controller, Get } from '@nestjs/common';
import { OpenaiAssistantService } from './openai-assistant.service';

@Controller('openai-assistant')
export class OpenaiAssistantController {
  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
  ) {}

  @Get()
  async createAssistant(
    @Body()
    assistantParams: {
      name: string;
      instructions: string;
    },
  ) {
    return await this.openaiAssistantService.createAssistant(assistantParams);
  }
}
