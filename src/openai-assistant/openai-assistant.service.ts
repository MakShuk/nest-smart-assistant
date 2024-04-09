import { Injectable, OnModuleInit } from '@nestjs/common';
import { lchown } from 'fs';
import OpenAI from 'openai';
import {
  Assistant,
  AssistantCreateParams,
} from 'openai/resources/beta/assistants/assistants';
import { Message } from 'openai/resources/beta/threads/messages/messages';
import { Thread } from 'openai/resources/beta/threads/threads';
const fsPromises = require('fs').promises;

enum ModelType {
  GPT_3_5_TURBO_0125 = 'gpt-3.5-turbo-0125',
  GPT_4_TURBO_PREVIEW = 'gpt-4-turbo-preview',
  GPT_4_VISION_PREVIEW = 'gpt-4-vision-preview',
}

@Injectable()
export class OpenaiAssistantService implements OnModuleInit {
  private openai: OpenAI;
  private assistantFilePath = './assistant.json';
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
      await new Promise((resolve) => setTimeout(resolve, 400));
      runStatus = await this.openai.beta.threads.runs.retrieve(
        thread.id,
        run.id,
      );
      console.log(runStatus.status);
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        console.log(
          `Run status is '${runStatus.status}'. Unable to complete the request.`,
        );
        break;
      }
    }

    const messages = await this.openai.beta.threads.messages.list(thread.id);

    const lastMessageForRun = messages.data
      .filter(
        (message) => message.run_id === run.id && message.role === 'assistant',
      )
      .pop();

    messages.data.forEach((message) => {
      console.log(message);
    });

    if (lastMessageForRun) {
      if ('text' in lastMessageForRun.content[0]) {
        lastMessage = lastMessageForRun.content[0].text.value;
        console.log(lastMessage);
      }
    } else if (!['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
      console.log('No response received from the assistant.');
    }

    return lastMessage;
  }

  async createAssistant(assistantParams: Partial<AssistantCreateParams>) {
    const param = this.getAssistantParams(assistantParams);
    const assistant = await this.openai.beta.assistants.create(param);
    const configs = await this.getAssistantConfig();
    this.saveAssistantConfig([...configs, assistant]);
    return assistant;
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

  async getAssistantConfig(): Promise<Assistant[]> {
    try {
      const assistantData = await fsPromises.readFile(
        this.assistantFilePath,
        'utf8',
      );
      return JSON.parse(assistantData);
    } catch (error) {
      console.error('Error reading assistant config:', error);
      return [];
    }
  }

  resetThread(): string {
    this.thread = null;
    return `reset thread`;
  }

  async saveAssistantConfig(assistantDetails: Assistant[]) {
    await fsPromises.writeFile(
      this.assistantFilePath,
      JSON.stringify(assistantDetails, null, 2),
    );
  }
}
