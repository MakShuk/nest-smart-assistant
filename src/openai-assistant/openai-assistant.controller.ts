import { Body, Controller, Get, Post } from '@nestjs/common';
import { OpenaiAssistantService } from './openai-assistant.service';

@Controller('openai-assistant')
export class OpenaiAssistantController {
  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
  ) {}

  @Post('create')
  async createAssistant(
    @Body()
    assistantParams: {
      name: string;
      instructions: string;
    },
  ) {
    return await this.openaiAssistantService.createAssistant(assistantParams);
  }

  @Get('all')
  async getAssistantConfig() {
    return await this.openaiAssistantService.getAssistantConfig();
  }

  @Get('start')
  async startDialog(
    @Body()
    massage: {
      content: string;
    },
  ) {
    return await this.openaiAssistantService.startDialog(massage.content);
  }
}
