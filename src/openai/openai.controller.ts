import { Body, Controller, Get, Res } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import fs, { ReadStream } from 'fs';
import { Stream } from 'openai/streaming';
import { Response } from 'express';
import {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import {
  ChatCompletionMessageParamType,
  ExtendedChatCompletionMessage,
  ITool,
} from './openai.interface';

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
    if (response.error) console.error(`Ошибка: ${response.content}`);
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
    if (response.error) console.error(`Ошибка: ${response.content}`);
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

  @Get('call-function')
  async callFunction() {
    const messages: ChatCompletionMessageParamType[] = [
      this.openaiService.createAssistantMessage(
        `What's the weather like in San Francisco, Tokyo, Moscow and Paris?`,
      ),
    ];

    function getCurrentWeather(location: string, unit = 'fahrenheit') {
      if (location.toLowerCase().includes('tokyo')) {
        return JSON.stringify({
          location: 'Tokyo',
          temperature: '10',
          unit: 'celsius',
        });
      } else if (location.toLowerCase().includes('san francisco')) {
        return JSON.stringify({
          location: 'San Francisco',
          temperature: '72',
          unit: 'fahrenheit',
        });
      } else if (location.toLowerCase().includes('paris')) {
        return JSON.stringify({
          location: 'Paris',
          temperature: '22',
          unit: 'fahrenheit',
        });
      } else {
        return JSON.stringify({ location, temperature: 'unknown' });
      }
    }
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

    const { toolCalls, responseMessage } =
      await this.openaiService.callFunction<ITool>(messages, tools);

    const availableFunctions: {
      [key: string]: (location: string, unit?: string) => string;
    } = {
      get_current_weather: getCurrentWeather,
    };

    messages.push(responseMessage);

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      const functionResponse = functionToCall(
        functionArgs.location,
        functionArgs.unit,
      );
      messages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: functionResponse,
      });
    }
    return await this.openaiService.response(messages);
  }

  @Get('transcription-audio')
  transcriptionAudio(): Promise<ExtendedChatCompletionMessage> {
    const stream: ReadStream = fs.createReadStream('audio.mp3');
    return this.openaiService.transcriptionAudio(stream);
  }
}
