import { Body, Controller, Get, Post, HttpCode } from '@nestjs/common';
import { OpenaiAssistantService } from './openai-assistant.service';

interface AssistantParams {
  name: string;
  instructions: string;
}

interface Message {
  content: string;
}

interface File {
  path: string;
  id: string;
}

@Controller('openai-assistant')
export class OpenaiAssistantController {
  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
  ) {}

  @Post('create')
  async createAssistant(
    @Body()
    assistantParams: AssistantParams,
  ) {
    return await this.openaiAssistantService.createAssistant(assistantParams);
  }

  @Get('all')
  async getAssistantConfig() {
    return await this.openaiAssistantService.getAssistantConfig();
  }

  @Post('start')
  async startDialog(
    @Body()
    message: Message,
  ) {
    return await this.openaiAssistantService.startDialog(message.content);
  }

  @Post('reset-chat')
  @HttpCode(204)
  resetChat() {
    return this.openaiAssistantService.resetThread();
  }

  @Post('upload-file')
  fileUploads(
    @Body()
    file: File,
  ) {
    return this.openaiAssistantService.uploadFile(file.path, file.id);
  }

  @Get('files')
  async getAllFiles() {
    return await this.openaiAssistantService.getAllfiles();
  }

  @Post('delete-file')
  async deleteFile(@Body() fileId: string) {
  if (!fileId) return 'Please provide a file id';
    return await this.openaiAssistantService.deleteFile(fileId);
  }
}
