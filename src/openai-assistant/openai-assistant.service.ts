import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import {
  Assistant,
  AssistantCreateParams,
} from 'openai/resources/beta/assistants/assistants';
import { Thread } from 'openai/resources/beta/threads/threads';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import { LoggerService } from 'src/services/logger/logger.service';

enum ModelType {
  GPT_3_5_TURBO_0125 = 'gpt-3.5-turbo-0125',
  GPT_4_TURBO_PREVIEW = 'gpt-4-turbo-preview',
  GPT_4_VISION_PREVIEW = 'gpt-4-vision-preview',
}

@Injectable()
export class OpenaiAssistantService implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}
  private openai: OpenAI;
  private assistantFilePath = '../../configs//assistant.json';
  private thread: Thread;
  model: ModelType = ModelType.GPT_3_5_TURBO_0125;

  async onModuleInit() {
    const openaiKey = process.env.OPEN_AI_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async startDialog(newMessage: string) {
    try {
      const currentAssistantId = (await this.getAssistantConfig())[0].id;
      if (!this.thread) {
        this.thread = await this.openai.beta.threads.create();
      }

      const thread = this.thread;
      let lastMessage: string;

      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `${newMessage}`,
      });

      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: currentAssistantId,
      });

      let runStatus = await this.openai.beta.threads.runs.retrieve(
        thread.id,
        run.id,
      );

      while (runStatus.status !== 'completed') {
        await this.sleep(400);
        runStatus = await this.openai.beta.threads.runs.retrieve(
          thread.id,
          run.id,
        );

        if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          this.logger.error(
            `Run status is '${runStatus.status}'. Unable to complete the request.`,
          );
          break;
        }
      }

      const messages = await this.openai.beta.threads.messages.list(thread.id);

      const lastMessageForRun = messages.data
        .filter(
          (message) =>
            message.run_id === run.id && message.role === 'assistant',
        )
        .pop();

      if (lastMessageForRun) {
        if ('text' in lastMessageForRun.content[0]) {
          lastMessage = lastMessageForRun.content[0].text.value;
        }
      } else if (
        !['failed', 'cancelled', 'expired'].includes(runStatus.status)
      ) {
        this.logger.error('No response received from the assistant.');
      }

      return lastMessage;
    } catch (error) {
      this.logger.error('Error starting dialog:', error);
      throw new Error('Failed to start dialog');
    }
  }

  async createAssistant(assistantParams: Partial<AssistantCreateParams>) {
    try {
      const param = this.getAssistantParams(assistantParams);
      const assistant = await this.openai.beta.assistants.create(param);
      const configs = await this.getAssistantConfig();
      this.saveAssistantConfig([...configs, assistant]);
      return assistant;
    } catch (error) {
      this.logger.error('Error creating assistant:', error);
      throw new Error('Failed to create assistant');
    }
  }

  async uploadFile(filePath: string, assistantId: string) {
    try {
      const data = await this.getAssistantConfig();
      const assistantDetails = data.filter(
        (assistant) => assistant.id === assistantId,
      )[0];

      if (!assistantDetails) {
        throw new Error('Assistant not found');
      }
      const file = await this.openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants',
      });

      let existingFileIds = assistantDetails.file_ids || [];

      await this.openai.beta.assistants.update(assistantId, {
        file_ids: [...existingFileIds, file.id],
      });

      data[0].file_ids = [...existingFileIds, file.id];

      await this.saveAssistantConfig(data);
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async getAssistantConfig(): Promise<Assistant[]> {
    try {
      const assistantData = await fsPromises.readFile(
        this.assistantFilePath,
        'utf8',
      );
      return JSON.parse(assistantData);
    } catch (error) {
      this.logger.error('Error reading assistant config:', error);
      return [];
    }
  }

  resetThread(): string {
    this.thread = null;
    return `reset thread`;
  }

  async saveAssistantConfig(assistantDetails: Assistant[]) {
    try {
      await fsPromises.writeFile(
        this.assistantFilePath,
        JSON.stringify(assistantDetails, null, 2),
      );
    } catch (error) {
      this.logger.error('Error saving assistant config:', error);
      throw new Error('Failed to save assistant config');
    }
  }

  private getAssistantParams(
    assistantParams: Partial<AssistantCreateParams>,
  ): AssistantCreateParams {
    const { name, instructions, tools, model } = assistantParams;
    return {
      name: name || 'Murder mystery helper',
      instructions:
        instructions ||
        "You're a murder mystery assistant, helping solve murder mysteries.",
      tools: tools || [{ type: 'retrieval' }],
      model: model || 'gpt-4-1106-preview',
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
