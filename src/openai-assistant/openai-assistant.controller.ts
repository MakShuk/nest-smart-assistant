import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Delete,
  Query,
} from '@nestjs/common';
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
    assistantParams: {
      name: string;
      instructions: string;
    },
  ) {
    return await this.openaiAssistantService.createAssistant(assistantParams);
  }

  @Get('all')
  async getAssistantConfig() {
    return await this.openaiAssistantService.getAllAssistantConfig();
  }

  @Delete('delete-assistant')
  async deleteAssistant(@Query() assistant: { id: string }) {
    return await this.openaiAssistantService.deleteAssistant(assistant.id);
  }

  @Post('start')
  async startDialog(
    @Body()
    param: {
      message: string;
      assistantId: string;
      threadId: string;
    },
  ) {
    return await this.openaiAssistantService.startDialog(
      param.message,
      param.assistantId,
      param.threadId,
    );
  }

  @Post('add-file-to-assistant')
  async addFileToAssistant(
    @Body() param: { fileId: string; assistantId: string },
  ) {
    return await this.openaiAssistantService.addFileToAssistant(
      param.assistantId,
      param.fileId,
    );
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

  @Post('create-thread')
  async createThread() {
    return await this.openaiAssistantService.createThread();
  }

  @Get('all-thread')
  async getAllThread(@Body() user: { id: string }) {
    return await this.openaiAssistantService.getAllThread(user.id);
  }

  @Delete('delete-thread')
  async deleteThread(@Body() threadId: string) {
    return await this.openaiAssistantService.deleteThread(threadId);
  }

  @Post('create-vector-store')
  async createVectorStore(
    @Body()
    param: {
      name: string;
      fileIds: string[];
    },
  ) {
    return await this.openaiAssistantService.createVectorStore(
      param.name,
      param.fileIds,
    );
  }

  @Post('add-vector-store-to-assistant')
  async addVectorStoreToAssistant(
    @Body()
    param: {
      vectorStoreId: string;
      assistantId: string;
    },
  ) {
    return await this.openaiAssistantService.addVectorStoreToAssistant(
      param.assistantId,
      [param.vectorStoreId],
    );
  }

  @Get('all-vector-store')
  async getAllVectorStore() {
    return await this.openaiAssistantService.getAllVectorStore();
  }

  @Delete('delete-vector-store')
  async deleteVectorStore(@Query() vectorStore: { id: string }) {
    return await this.openaiAssistantService.deleteVectorStore(vectorStore.id);
  }

  @Get('stream-response')
  async streamResponse(
    @Body()
    param: {
      message: string;
      assistantId: string;
      threadId: string;
    },
  ) {
    const streamStatus = await this.openaiAssistantService.streamResponse(
      param.message,
      param.assistantId,
      param.threadId,
    );

    if ('errorMessages' in streamStatus) {
      return streamStatus;
    }

    streamStatus.data.on('textDelta', (textDelta, _) => {
      console.log(textDelta.value);
    });
  }

  @Delete('delete-all-vector-store')
  async deleteAllVectorStore() {
    const responseStatus =
      await this.openaiAssistantService.getAllVectorStore();
    if (`errorMessages` in responseStatus) {
      return responseStatus;
    }
    if (responseStatus.data.length === 0) {
      return 'There is no vector store to delete';
    }
    for (const vectorStore of responseStatus.data) {
      console.log(`Deleting vector store ${vectorStore.id}`);
      const deleteStatus = await this.openaiAssistantService.deleteVectorStore(
        vectorStore.id,
      );
      if (`errorMessages` in deleteStatus) {
        console.log(deleteStatus);
      }
    }
    return 'All vector store has been deleted';
  }

  @Delete('delete-all-file')
  async deleteAllFile() {
    const responseStatus = await this.openaiAssistantService.getAllfiles();
    if (`errorMessages` in responseStatus) {
      return responseStatus;
    }
    if (responseStatus.data.length === 0) {
      return 'There is no file to delete';
    }
    for (const file of responseStatus.data) {
      console.log(`Deleting file ${file.id}`);
      const deleteStatus = await this.openaiAssistantService.deleteFile(
        file.id,
      );
      if (`errorMessages` in deleteStatus) {
        console.log(deleteStatus);
      }
    }
    return 'All files has been deleted';
  }

  @Delete(`delete-all-assitant`)
  async deleteAllAssistant() {
    const responseStatus =
      await this.openaiAssistantService.getAllAssistantConfig();
    if (`errorMessages` in responseStatus) {
      return responseStatus;
    }
    if (responseStatus.data.length === 0) {
      return 'There is no assistant to delete';
    }

    const defaultAssistantId: string[] = [
      `asst_VFmM5c80KCBG2ENgmDyLrzDe`,
      `asst_qpwQE2K1ewj0WI2VcSWArfue`,
      `asst_SgOYHidqUmqTKYcLEyb3rSUJ`,
      `asst_IDIz4we3F3Rb1Q0KIReHTRTw`,
      `asst_qvFojSb5xXcHm5qOOWXFQXCy`,
    ];

    for (const assistant of responseStatus.data) {
      if (defaultAssistantId.includes(assistant.id)) {
        continue;
      }
      console.log(`Deleting assistant ${assistant.id}`);
      const deleteStatus = await this.openaiAssistantService.deleteAssistant(
        assistant.id,
      );
      if (`errorMessages` in deleteStatus) {
        console.log(deleteStatus);
      }
    }
    return 'All assistant has been deleted';
  }
}
