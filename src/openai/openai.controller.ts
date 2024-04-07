import { Body, Controller, Get, Res } from '@nestjs/common';
import { OpenaiService, ExtendedChatCompletionMessage } from './openai.service';
import fs, { ReadStream } from 'fs';
import { Stream } from 'openai/streaming';
import { Response } from 'express';
import { ChatCompletionChunk } from 'openai/resources/chat';
import OpenAI from 'openai';

interface ITool extends OpenAI.Chat.Completions.ChatCompletionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: {
        location?: {
          type: string;
          description: string;
        };
        unit?: {
          type: string;
          enum: ['celsius', 'fahrenheit'];
        };
      };
      required: string[];
    };
  };
}

@Controller('openai')
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  @Get('response')
  async response(
    @Body() text: { content: string; assistant: boolean },
  ): Promise<ExtendedChatCompletionMessage> {
    const messages = [];
    messages.push(
      this.openaiService.createAssistantMessage(`${text.assistant}`),
    );
    messages.push(this.openaiService.createUserMessage(`${text.content}`));
    const response = await this.openaiService.response(messages);
    if (response.error) console.log(`Ошибка: ${response.content}`);
    return response;
  }

  @Get('json-response')
  async jsonResponse(
    @Body() text: { content: string; assistant: boolean },
  ): Promise<ExtendedChatCompletionMessage> {
    const messages = [];
    messages.push(
      this.openaiService.createAssistantMessage(
        `You are a helpful assistant designed to output JSON.
        Example:
         "schedule":{ \"7:00\": \"[обучение]\" }
         , don't use markdown`,
      ),
    );
    const message = `"${text.content}"`;
    messages.push(
      this.openaiService.createUserMessage(`${text.assistant} ${message}`),
    );
    const response = await this.openaiService.response(messages);
    if (response.error) console.log(`Ошибка: ${response.content}`);
    return JSON.parse(response.content);
  }

  @Get('stream-response')
  async streamResponse(
    @Res() res: Response,
  ): Promise<Stream<ChatCompletionChunk> | string> {
    const message = this.openaiService.createUserMessage(
      'Расскажи подробно он докер compose',
    );
    const yourStream = await this.openaiService.streamResponse([message]);
    if (yourStream instanceof Stream) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=stream.txt');
      for await (const part of yourStream) {
        process.stdout.write(part.choices[0]?.delta?.content || '');
      }
      return yourStream;
    } else {
      return yourStream.content || 'Нет данных';
    }
  }

  @Get('image-response')
  async imageResponse() {
    const messages = this.openaiService.createImageUserMessage(
      'Что на картинке?',
      'https://docs.nestjs.com/assets/Controllers_1.png',
    );
    return await this.openaiService.imageResponse([messages]);
  }

  @Get('file-uploads')
  fileUploads(): Promise<void> {
    return this.openaiService.fileUploads();
  }

  @Get('call-function')
  async callFunction(): Promise<{
    responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
  }> {
    const messages = [
      this.openaiService.createAssistantMessage(
        `What's the weather like in San Francisco, Tokyo, and Paris?`,
      ),
    ];
    const tools: ITool[] = [
      {
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA',
              },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      },
    ];
    return await this.openaiService.callFunction<ITool>(messages, tools);
  }

  @Get('transcription-audio')
  transcriptionAudio(): Promise<ExtendedChatCompletionMessage> {
    const stream: ReadStream = fs.createReadStream('audio.mp3');
    return this.openaiService.transcriptionAudio(stream);
  }
}
