import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import fs from 'fs';

import {
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { ReadStream } from 'fs';
import { Stream } from 'openai/streaming';

export interface ExtendedChatCompletionMessage extends ChatCompletionMessage {
  error?: boolean;
  cost?: string;
}

type model =
  | 'gpt-3.5-turbo-0125'
  | 'gpt-4-turbo-preview'
  | 'gpt-4-vision-preview';

@Injectable()
export class OpenaiService {
  constructor() {}
  openai: OpenAI;
  model: model = 'gpt-3.5-turbo-0125';

  async onModuleInit() {
    const openaiKey = process.env.OPEN_AI_KEY;

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }

    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async response(
    messages: ChatCompletionMessageParam[],
  ): Promise<ExtendedChatCompletionMessage> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: this.model,
      });
      const cost = this.costCalculation(completion);
      console.log(cost);
      return {
        ...completion.choices[0]?.message,
        cost,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const { status, message, code, type } = error;
        console.error(
          `status: ${status} message: ${message} code: ${code} type: ${type}`,
        );
        return {
          role: 'assistant',
          content: `status: ${status} message: ${message} code: ${code} type: ${type}`,
          error: true,
        };
      } else {
        return {
          role: 'assistant',
          content: `Non-API error, ${error}`,
          error: true,
        };
      }
    }
  }

  async streamResponse(
    messages: ChatCompletionMessageParam[],
  ): Promise<Stream<ChatCompletionChunk> | ExtendedChatCompletionMessage> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        stream: true,
      });
      return stream;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const { status, message, code, type } = error;
        const errorMessage = `status: ${status} message: ${message} code: ${code} type: ${type}`;
        console.error(errorMessage);
        return {
          role: 'assistant',
          content: errorMessage,
          error: true,
        };
      } else {
        return {
          role: 'assistant',
          content: `Non-API error, ${error}`,
          error: true,
        };
      }
    }
  }

  async imageResponse(
    messages: ChatCompletionMessageParam[],
  ): Promise<ExtendedChatCompletionMessage> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: messages,
      });
      if (!completion.choices[0]?.message)
        throw new Error('openai.chat.completions is undefined');
      return completion.choices[0]?.message;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const { status, message, code, type } = error;
        const errorMessage = `status: ${status} message: ${message} code: ${code} type: ${type}`;
        console.error(errorMessage);
        return {
          role: 'assistant',
          content: errorMessage,
          error: true,
        };
      } else {
        return {
          role: 'assistant',
          content: `Non-API error, ${error}`,
          error: true,
        };
      }
    }
  }

  async transcriptionAudio(
    audioStream: ReadStream,
  ): Promise<ExtendedChatCompletionMessage> {
    try {
      const response = await this.openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioStream,
      });
      return {
        role: 'assistant',
        content: response.text,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const { status, message, code, type } = error;
        const errorMessage = `status: ${status} message: ${message} code: ${code} type: ${type}`;
        console.error(errorMessage);
        return {
          role: 'assistant',
          content: errorMessage,
          error: true,
        };
      } else {
        return {
          role: 'assistant',
          content: `Non-API error, ${error}`,
          error: true,
        };
      }
    }
  }

  async callFunction<T extends OpenAI.Chat.Completions.ChatCompletionTool>(
    messages: ChatCompletionMessageParam[],
    tools: T[],
  ) {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      tools,
      tool_choice: 'auto',
    });
    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;
    console.log(this.costCalculation(response));

    return { responseMessage };
  }

  async fileUploads(): Promise<void> {
    await this.openai.files.create({
      file: fs.createReadStream('input.json'),
      purpose: 'fine-tune',
    });
  }

  createUserMessage(message: string): ChatCompletionMessageParam {
    return {
      role: 'user',
      content: message,
    };
  }

  createAssistantMessage(message: string): ChatCompletionMessageParam {
    return {
      role: 'assistant',
      content: message,
    };
  }

  createImageUserMessage(
    message: string,
    url: string,
  ): ChatCompletionMessageParam {
    return {
      role: 'user',
      content: [
        { type: 'text', text: message },
        {
          type: 'image_url',
          image_url: {
            url: url,
          },
        },
      ],
    };
  }

  private costCalculation(
    completion: OpenAI.Chat.Completions.ChatCompletion,
  ): string {
    const prices = [
      {
        name: 'gpt-4-0125-preview',
        input: 10,
        output: 30,
      },
      {
        name: 'gpt-4',
        input: 30,
        output: 60,
      },
      {
        name: 'gpt-3.5-turbo-0125',
        input: 0.5,
        output: 1.5,
      },
    ];
    const price = prices.find((e) => e.name === completion.model);

    if (!price) {
      const message = `Модель ${completion.model} не найдена`;
      console.error(message);
      return message;
    }

    const { input, output } = price;

    const { prompt_tokens, completion_tokens } = completion.usage;
    const denominator = 1_000_000;
    const inputCost = prompt_tokens * (input / denominator);
    const outputCost = completion_tokens * (output / denominator);

    const fullCostRub = ((inputCost + outputCost) * 100)
      .toFixed(6)
      .replace(/\.?0+$/, '');

    return `Общая стоимость запроса: ${fullCostRub} руб.`;
  }
}
