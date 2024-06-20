import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { Thread } from 'openai/resources/beta/threads/threads';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from 'src/services/logger/logger.service';
import { AssistantCreateParams } from 'openai/resources/beta/assistants';

enum ModelType {
  GPT_3_5_TURBO_0125 = 'gpt-3.5-turbo-0125',
  GPT_4_TURBO_PREVIEW = 'gpt-4-turbo-preview',
  GPT_4_VISION_PREVIEW = 'gpt-4-vision-preview',
  GPT_4o_2024_05_13 = 'gpt-4o-2024-05-13',
}
@Injectable()
export class OpenaiAssistantService implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}
  private openai: OpenAI;

  model: ModelType = ModelType.GPT_4o_2024_05_13;

  async onModuleInit() {
    const openaiKey = process.env.OPEN_AI_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async startDialog(newMessage: string, assistantId: string, threadId: string) {
    try {
      let lastMessage = '';
      // Создаем сообщение от пользователя в текущем треде.
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: `${newMessage}`,
      });

      // Создаем новый запуск для текущего треда с идентификатором помощника.
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      // Получаем статус текущего запуска.
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        threadId,
        run.id,
      );

      // Пока статус запуска не "завершено", ждем и снова проверяем статус.
      while (runStatus.status !== 'completed') {
        await this.sleep(400);
        runStatus = await this.openai.beta.threads.runs.retrieve(
          threadId,
          run.id,
        );

        // Если статус запуска указывает на ошибку, прерываем выполнение.
        if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          this.logger.error(
            `Run status is '${runStatus.status}'. Unable to complete the request.`,
          );
          throw Error(runStatus.last_error?.message);
        }
      }
      // Получаем все сообщения в треде.
      const messages = await this.openai.beta.threads.messages.list(threadId);

      // Фильтруем сообщения, чтобы найти последнее сообщение от помощника для текущего запуска
      const lastMessageForRun = messages.data
        .filter(
          (message) =>
            message.run_id === run.id && message.role === 'assistant',
        )
        .pop();
      // Если найдено сообщение от помощника, получаем его текст.
      if (lastMessageForRun) {
        if ('text' in lastMessageForRun.content[0]) {
          lastMessage = lastMessageForRun.content[0].text.value;
        }
      } else if (
        // Если статус запуска не указывает на ошибку, лоцируем отсутствие ответа от помощника.
        !['failed', 'cancelled', 'expired'].includes(runStatus.status)
      ) {
        this.logger.error('No response received from the assistant.');
      }
      return { data: lastMessage };
    } catch (error) {
      const errorMessages = `Start dialog: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async createAssistant(assistantParams: {
    name: string;
    instructions: string;
  }) {
    try {
      const param: AssistantCreateParams = {
        name: assistantParams.name,
        model: this.model,
        instructions: assistantParams.instructions,
        tools: [{ type: 'code_interpreter' }, { type: 'file_search' }],
      };

      const assistant = await this.openai.beta.assistants.create(param);
      return { data: assistant };
    } catch (error) {
      const errorMessages = `Create assistant: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async getAllAssistantConfig() {
    try {
      const assistant = await this.openai.beta.assistants.list();
      return { data: assistant.data };
    } catch (error) {
      const errorMessages = `Create assistant: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async addFileToAssistant(assistantId: string, fileId: string) {
    try {
      const configStatus = await this.getAllAssistantConfig();
      if ('errorMessages' in configStatus) {
        throw new Error(configStatus.errorMessages);
      }

      const assistantDetails = configStatus.data.filter(
        (assistant) => assistant.id === assistantId,
      )[0];

      if (!assistantDetails) {
        throw new Error('Assistant not found');
      }

      let existingFileIds =
        assistantDetails.tool_resources.code_interpreter.file_ids;

      const update = await this.openai.beta.assistants.update(assistantId, {
        tool_resources: {
          code_interpreter: {
            file_ids: [...existingFileIds, fileId],
          },
        },
      });
      return { data: update };
    } catch (error) {
      const errorMessages = `Add file to assistant: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async addVectorStoreToAssistant(
    assistantId: string,
    vectorStoreIds: string[],
  ) {
    try {
      const update = await this.openai.beta.assistants.update(assistantId, {
        tool_resources: {
          file_search: {
            vector_store_ids: [...vectorStoreIds],
          },
        },
      });
      return { data: update };
    } catch (error) {
      const errorMessages = `Add vector store to assistant: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async deleteAssistant(assistantId: string) {
    try {
      const assistant = await this.openai.beta.assistants.del(assistantId);
      return { data: assistant };
    } catch (error) {
      const errorMessages = `Delete assistant: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async uploadFile(filePath: string, assistantId?: string) {
    try {
      const stream = fs.createReadStream(filePath);

      const file = await this.openai.files.create({
        file: stream,
        purpose: 'assistants',
      });

      if (assistantId) {
        const data = await this.addFileToAssistant(assistantId, file.id);
        if ('errorMessages' in data) {
          throw new Error(data.errorMessages);
        }
        return { data: file };
      }

      return { data: file };
    } catch (error) {
      const errorMessages = `Upload file: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async getAllfiles() {
    try {
      const files = await this.openai.files.list();
      return { data: files.data };
    } catch (error) {
      const errorMessages = `All files: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async deleteFile(fileId: string) {
    try {
      const data = await this.openai.files.del(fileId);
      return { data };
    } catch (error) {
      const errorMessages = `Delete File ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async getAllThread(fileName: string = 'thread') {
    try {
      const savePath = path.join(
        __dirname,
        '..',
        '..',
        'sessions',
        `t-${fileName}.json`,
      );

      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(path.join(__dirname, '..', '..', 'sessions'), {
          recursive: true,
        });
      }

      const savedThread = await fsPromises.readFile(savePath, 'utf8');
      if (!savedThread && savedThread.length === 0) {
        throw new Error(`No thread found in ${savePath}`);
      }

      const threadData: Thread[] = JSON.parse(savedThread);
      if (!(Array.isArray(threadData) && threadData.length > 0)) {
        return { data: [] };
      }

      return { data: threadData };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { data: [] };
      }
      const errorMessages = `Getting all threads: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async createThread(
    vector_store_ids: string[] = [],
    fileName: string = 'thread',
  ) {
    try {
      const settings =
        vector_store_ids.length === 0
          ? {}
          : {
              tool_resources: {
                file_search: { vector_store_ids: [...vector_store_ids] },
              },
            };
      const thread = await this.openai.beta.threads.create(settings);

      const saveStatus = await this.saveThread(thread, fileName);
      if ('errorMessages' in saveStatus) {
        throw new Error(saveStatus.errorMessages);
      }
      return { data: thread };
    } catch (error) {
      const errorMessages = `Create thread: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async deleteThread(threadId: string, fileName: string = 'thread') {
    try {
      const savePath = path.join(
        __dirname,
        '..',
        '..',
        'sessions',
        `t-${fileName}.json`,
      );
      const threadStatus = await this.getAllThread();
      if ('errorMessages' in threadStatus) {
        throw new Error(threadStatus.errorMessages);
      }

      const updatedThread = threadStatus.data.filter(
        (thread) => thread.id !== threadId,
      );

      await fsPromises.writeFile(
        savePath,
        JSON.stringify(updatedThread, null, 2),
      );

      const thread = await this.openai.beta.threads.del(threadId);
      return { data: thread };
    } catch (error) {
      const errorMessages = `Delete thread: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async createVectorStore(name: string, fileIds: string[]) {
    try {
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: name,
        file_ids: [...fileIds],
      });

      return { data: vectorStore };
    } catch (error) {
      const errorMessages = `Create vector store: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async getAllVectorStore() {
    try {
      const vectorStore = await this.openai.beta.vectorStores.list();
      const completedVectorStore = vectorStore.data.filter(
        (vector) => vector.status === 'completed',
      );
      return { data: completedVectorStore };
    } catch (error) {
      const errorMessages = `Get all vector store: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async deleteVectorStore(vectorStoreId: string) {
    try {
      const vectorStore =
        await this.openai.beta.vectorStores.del(vectorStoreId);
      return { data: vectorStore };
    } catch (error) {
      const errorMessages = `Delete vector store: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async transcriptionAudio(audioStream: fs.ReadStream) {
    try {
      const response = await this.openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioStream,
      });
      return {
        data: response.text,
      };
    } catch (error) {
      const errorMessages = `Delete vector store: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async streamResponse(
    newMessage: string,
    assistantId: string,
    threadId: string,
  ) {
    try {
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: `${newMessage}`,
      });

      const stream = this.openai.beta.threads.runs.stream(threadId, {
        assistant_id: assistantId,
      });

      return { data: stream };
    } catch (error) {
      const errorMessages = `Test run: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  private async saveThread(thread: Thread, fileName: string = 'thread') {
    try {
      const savePath = path.join(
        __dirname,
        '..',
        '..',
        'sessions',
        `t-${fileName}.json`,
      );
      const threadStatus = await this.getAllThread(fileName);
      if ('errorMessages' in threadStatus) {
        throw new Error(threadStatus.errorMessages);
      }

      if (threadStatus.data.length === 0) {
        threadStatus.data = [];
      }

      const updatedThread = await fsPromises.writeFile(
        savePath,
        JSON.stringify([...(threadStatus.data || []), thread], null, 2),
      );

      return { data: updatedThread };
    } catch (error) {
      const errorMessages = `Save thread: ${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
