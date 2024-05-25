import { Assistant, AssistantTool } from 'openai/resources/beta/assistants';
import { AssistantResponseFormatOption } from 'openai/resources/beta/threads/threads';

interface Tool {
  type: string;
}

interface ToolResources {
  file_search?: {
    vector_store_ids: string[];
  };
  code_interpreter?: {
    file_ids: string[];
  };
}

export interface IAssistantSettings {
  id: string;
  created_at: number;
  description: string;
  instructions: string;
  metadata: unknown;
  model: string;
  name: string;
  object: 'assistant';
  tools: AssistantTool[];
  response_format?: AssistantResponseFormatOption;
  temperature?: number;
  tool_resources?: Assistant.ToolResources;
  top_p?: number;
  activated: boolean;
}

export type settingsStatusType =
  | {
      data: IAssistantSettings[];
      errorMessages?: undefined;
    }
  | {
      errorMessages: string;
      data?: undefined;
    };
