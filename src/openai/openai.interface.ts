import OpenAI from 'openai';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionFunctionMessageParam,
  ChatCompletionMessage,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';

export interface ITool extends OpenAI.Chat.Completions.ChatCompletionTool {
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

export interface ExtendedChatCompletionMessage extends ChatCompletionMessage {
  error?: boolean;
  cost?: string;
}

export interface IPrice {
  name: model;
  input: number;
  output: number;
}

interface ExtendedChatCompletionToolMessageParam
  extends ChatCompletionToolMessageParam {
  name: string;
}

export type ChatCompletionMessageParamType =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam
  | ChatCompletionFunctionMessageParam
  | ExtendedChatCompletionToolMessageParam;

type model =
  | 'gpt-3.5-turbo-0125'
  | 'gpt-4-turbo-preview'
  | 'gpt-4-vision-preview'
  | 'gpt-4o-2024-05-13';
