import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import {
  Assistant,
  AssistantCreateParams,
} from 'openai/resources/beta/assistants/assistants';
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
  model: ModelType = ModelType.GPT_3_5_TURBO_0125;

  async onModuleInit() {
    const openaiKey = process.env.OPEN_AI_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
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

  async saveAssistantConfig(assistantDetails: Assistant[]) {
    await fsPromises.writeFile(
      this.assistantFilePath,
      JSON.stringify(assistantDetails, null, 2),
    );
  }
}
