import { Injectable } from '@nestjs/common';
import { OpenaiAssistantService } from 'src/openai-assistant/openai-assistant.service';
import { Context, Markup } from 'telegraf';
import { AssistantSettingsService } from '../assistant-settings/assistant-settings.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Message } from 'telegraf/typings/core/types/typegram';
import { OggConverter } from '../converter/ogg-converter.service';

@Injectable()
export class AssistantCommandsService {
  constructor(
    private assistantService: OpenaiAssistantService,
    private settings: AssistantSettingsService,
    private oggConverter: OggConverter,
  ) {}

  files = async (ctx: Context) => {
    try {
      const filesStatus = await this.assistantService.getAllfiles();
      if ('errorMessages' in filesStatus) {
        return ctx.reply(
          `📂 Не удалось получить доступ к файлам ${filesStatus.errorMessages}`,
        );
      }
      if (filesStatus.data.length === 0) {
        return ctx.reply('📂 Нет доступных файлов');
      }

      const files = filesStatus.data.map((file) => {
        return `📂 ${file.filename}: id: ${file.id}`;
      });
      return ctx.reply(files.join('\n'));
    } catch (error) {
      console.error('Error in files method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке файлов');
    }
  };

  info = async (ctx: Context) => {
    try {
      return ctx.reply(`Команды бота:
       /start - Открывает главное меню помощника.
       /reset - Сбрасывает текущее состояние или диалог.
       /o - Преобразует текст в речь.
      /files - Показывает файлы.
      /store - Получает векторное представление хранилища.
      /0 - Исправляет текст.`);
    } catch (error) {
      console.error('Error in info method:', error);
      return ctx.reply('⚠️ Произошла ошибка при получении информации');
    }
  };

  assistantMenu = async (ctx: Context) => {
    try {
      const defaultAssistantParams = {
        name: `default`,
        instructions: `Бот для дружеского общения с пользователем с именем ${ctx.from.first_name}`,
      };

      let assistantStatus = await this.settings.getAssistantSettings(
        ctx.from.id,
      );
      if ('errorMessages' in assistantStatus) {
        let newAssistantStatus = await this.assistantService.createAssistant(
          defaultAssistantParams,
        );

        const newThreadStatus = await this.assistantService.createThread(
          [],
          `${ctx.from.id}`,
        );

        if ('errorMessages' in newThreadStatus) {
          return ctx.reply(
            `📂 Не удалось создать новый поток ${newThreadStatus.errorMessages}`,
          );
        }

        if ('errorMessages' in newAssistantStatus) {
          return ctx.reply(
            `📂 Не удалось получить настройки ассистента ${newAssistantStatus.errorMessages}`,
          );
        }
        assistantStatus.data = [
          { ...newAssistantStatus.data, activated: true },
        ];
      }

      const updatedData = assistantStatus.data.map((item) => ({
        ...item,
        activated: false,
      }));

      const saveSettingsStatus = this.settings.saveSettings(
        ctx.from.id,
        updatedData,
      );

      if ('errorMessages' in saveSettingsStatus) {
        return ctx.reply(
          `📂 Не удалось сохранить настройки ассистента ${saveSettingsStatus.errorMessages}`,
        );
      }

      const menu = assistantStatus.data
        .filter((item) => item.name)
        .map((item, index) => {
          let status: string = '';
          if ('activated' in item && item.activated) {
            status = item.activated ? '✅ ' : '';
          }
          return [
            Markup.button.callback(
              `${status}${item.name}`,
              'button' + (index + 1),
            ),
          ];
        });

      return ctx.reply('Список ассистентов', Markup.inlineKeyboard(menu));
    } catch (error) {
      console.error('Error in assistantMenu method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке меню ассистента');
    }
  };

  setAssistantSettings = async (ctx: Context) => {
    try {
      const userId = ctx.from.id;
      if ('match' in ctx && Array.isArray(ctx.match)) {
        let lastDigitRegex = ctx.match[0].match(/\d+$/) - 1;
        const settingsStatus = await this.settings.getAssistantSettings(userId);

        if ('errorMessages' in settingsStatus) {
          return ctx.reply(
            `📂 Не удалось получить настройки ассистента ${settingsStatus.errorMessages}`,
          );
        }

        const settingsUpdate = settingsStatus.data.map((setting) => ({
          ...setting,
          activated: false,
        }));

        if (
          lastDigitRegex >= 0 &&
          lastDigitRegex < settingsStatus.data.length
        ) {
          settingsUpdate[lastDigitRegex].activated = true;
        }

        const saveSettingsStatus = this.settings.saveSettings(
          userId,
          settingsUpdate,
        );
        if ('errorMessages' in saveSettingsStatus) {
          return ctx.reply(
            `📂 Не удалось сохранить настройки ассистента ${saveSettingsStatus.errorMessages}`,
          );
        }
        ctx.reply('✅ Настройки ассистента успешно сохранены');
      }
    } catch (error) {
      console.error('Error in setAssistantSettings method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке настроек ассистента');
    }
  };

  text = async (ctx: Context) => {
    try {
      if (!('text' in ctx.message)) return;

      const assistantStatus = await this.settings.getAssistantSettings(
        ctx.from.id,
      );
      if ('errorMessages' in assistantStatus) {
        return ctx.reply(
          `📂 Не удалось получить настройки ассистента ${assistantStatus.errorMessages}`,
        );
      }

      const assistant = assistantStatus.data.find((item) => item.activated);
      if (!assistant) {
        return ctx.reply('⚠️ Ассистент не выбран');
      }

      let threadStatus = await this.assistantService.getAllThread(
        `${ctx.from.id}`,
      );
      if ('errorMessages' in threadStatus) {
        return ctx.reply(
          `📂 Не удалось получить доступ к потокам ${threadStatus.errorMessages}`,
        );
      }

      const sendMessage = await ctx.reply('🔄 Подождите, ответ формируется...');

      if (threadStatus.data.length === 0) {
        const newThreadStatus = await this.assistantService.createThread();
        threadStatus.data[0] = newThreadStatus.data;
        if ('errorMessages' in newThreadStatus) {
          return ctx.reply(
            `📂 Не удалось создать новый поток ${newThreadStatus.errorMessages}`,
          );
        }
      }

      const maxCreatedAt = threadStatus.data.reduce(
        (max, current) => (current.created_at > max.created_at ? current : max),
        threadStatus.data[0],
      );

      const runChatStatus = await this.assistantService.startDialog(
        ctx.message.text,
        assistant.id,
        maxCreatedAt.id,
      );

      if ('errorMessages' in runChatStatus) {
        return ctx.reply(
          `📂 Не удалось запустить диалог ${runChatStatus.errorMessages}`,
        );
      }

      const messagesSplit = this.splitMessage(runChatStatus.data, 4096);

      for (const message of messagesSplit) {
        await ctx.reply(message);
      }
      return;
    } catch (error) {
      console.error('Error in message method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке сообщения');
    }
  };

  streamText = async (ctx: Context) => {
    if (!('text' in ctx.message)) return;

    const assistantStatus = await this.settings.getAssistantSettings(
      ctx.from.id,
    );
    if ('errorMessages' in assistantStatus) {
      return ctx.reply(
        `📂 Не удалось получить настройки ассистента ${assistantStatus.errorMessages}`,
      );
    }

    const assistant = assistantStatus.data.find((item) => item.activated);
    if (!assistant) {
      return ctx.reply('⚠️ Ассистент не выбран');
    }

    let threadStatus = await this.assistantService.getAllThread(
      `${ctx.from.id}`,
    );

    if ('errorMessages' in threadStatus) {
      return ctx.reply(
        `📂 Не удалось получить доступ к потокам ${threadStatus.errorMessages}`,
      );
    }

    let sendMessage = await ctx.reply('🔄 Подождите, ответ формируется...');

    if (threadStatus.data.length === 0) {
      const newThreadStatus = await this.assistantService.createThread();
      threadStatus.data[0] = newThreadStatus.data;
      if ('errorMessages' in newThreadStatus) {
        return ctx.reply(
          `📂 Не удалось создать новый поток ${newThreadStatus.errorMessages}`,
        );
      }
    }

    const lastThread = threadStatus.data.reduce(
      (max, current) => (current.created_at > max.created_at ? current : max),
      threadStatus.data[0],
    );

    const runChatStatus = await this.assistantService.streamResponse(
      ctx.message.text,
      assistant.id,
      lastThread.id,
    );

    if ('errorMessages' in runChatStatus) {
      return ctx.reply(
        `📂 Не удалось запустить диалог ${runChatStatus.errorMessages}`,
      );
    }

    const stream = runChatStatus.data;

    let textInStream = ``;
    let lastCallTime = Date.now();

    let messagesSplit: string[] = [];

    stream.on('textDelta', async (textDelta, _) => {
      textInStream += textDelta.value || '';
      const currentTime = Date.now();
      messagesSplit = this.splitMessage(textInStream, 3900);
      if (currentTime - lastCallTime > 1000) {
        lastCallTime = currentTime;
        if (messagesSplit.length > 1) {
          messagesSplit = this.splitMessage(textInStream, 3900);
          await this.editMessageText(ctx, sendMessage, messagesSplit[0]);
          sendMessage = await ctx.reply(`Обработка сообщения...`);
          textInStream = messagesSplit[1];
        } else {
          await this.editMessageText(ctx, sendMessage, messagesSplit[0]);
        }
      }
    });

    await new Promise((resolve, reject) => {
      stream.on('end', () => resolve('end'));
      stream.on('error', reject);
    });

    await this.editMessageText(ctx, sendMessage, textInStream);
  };

  reset = async (ctx: Context) => {
    try {
      const userId = String(ctx.from.id);
      const newThreadStatus = await this.assistantService.createThread(
        [],
        userId,
      );

      if ('errorMessages' in newThreadStatus) {
        return ctx.reply(
          `📂 Не удалось создать новый поток ${newThreadStatus.errorMessages}`,
        );
      }
      return ctx.reply('📂 Диалог сброшен, создан новый диалог');
    } catch (error) {
      console.error('Error in reset method:', error);
      return ctx.reply('⚠️ Произошла ошибка при сбросе диалога');
    }
  };

  file = async (ctx: Context) => {
    try {
      if (!('document' in ctx.message)) return;

      const sendMessage = await ctx.reply(
        '🔄 Подождите, идет обработка файла...',
      );
      const fileId = ctx.message.document.file_id;
      const fileName = ctx.message.document.file_name;
      const userId = ctx.from.id;
      const fileExtension = fileName.split('.').pop();

      const link = await ctx.telegram.getFileLink(fileId);
      const filePath = `./sessions/${userId}-${fileName}.${fileExtension}`;

      await this.editMessageText(ctx, sendMessage, '🔄 Файл загружается...');

      const fileSaveStatus = await this.downloadFile(`${link}`, filePath);
      if ('errorMessages' in fileSaveStatus) {
        return ctx.reply(fileSaveStatus.errorMessages);
      }

      const createFileStatus = await this.assistantService.uploadFile(filePath);
      if ('errorMessages' in createFileStatus) {
        return ctx.reply(
          `📂 Не удалось загрузить файл ${createFileStatus.errorMessages}`,
        );
      }

      const deleteFileStatus = await this.deleteFile(filePath);

      if ('errorMessages' in deleteFileStatus) {
        return ctx.reply(deleteFileStatus.errorMessages);
      }

      await this.editMessageText(
        ctx,
        sendMessage,
        '🔄 Файл загружен, обрабатывается...',
      );

      const createVectorStoreStatus =
        await this.assistantService.createVectorStore(fileName, [
          createFileStatus.data.id,
        ]);

      if ('errorMessages' in createVectorStoreStatus) {
        return ctx.reply(
          `📂 Не удалось создать векторное хранилище ${createVectorStoreStatus.errorMessages}`,
        );
      }

      const createThreadStatus = await this.assistantService.createThread(
        [createVectorStoreStatus.data.id],
        `${userId}`,
      );

      if ('errorMessages' in createThreadStatus) {
        return ctx.reply(
          `📂 Не удалось создать поток ${createThreadStatus.errorMessages}`,
        );
      }

      return await this.editMessageText(
        ctx,
        sendMessage,
        '✅ Файл успешно обработан',
      );
    } catch (error) {
      console.error('Error in file method:', error);
      return ctx.reply(
        `⚠️ Произошла ошибка при обработке файла: ${error.message}`,
      );
    }
  };

  audioMessage = async (ctx: Context) => {
    try {
      if (!('voice' in ctx.message)) return;
      const sendMessage = await ctx.reply(
        '🔄 Подождите, идет обработка аудио...',
      );

      const audioFolderPath = path.join(__dirname, '..', '..', '..', 'audios');
      const fileId = ctx.message.voice?.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const userId = ctx.from.id;

      const response = await axios({
        method: 'get',
        url: String(fileLink),
        responseType: 'stream',
      });

      if (!fs.existsSync(audioFolderPath)) {
        fs.mkdirSync(audioFolderPath);
      }

      const writer = fs.createWriteStream(
        `${audioFolderPath}/${ctx.from.id}.ogg`,
      );

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      await this.covertToMp3(String(userId));

      const readStream = fs.createReadStream(
        `${audioFolderPath}/${ctx.from.id}.ogg`,
      );

      const transcription =
        await this.assistantService.transcriptionAudio(readStream);

      if ('errorMessages' in transcription) {
        return ctx.reply(
          `📂 Не удалось преобразовать аудио в текст ${transcription.errorMessages}`,
        );
      }

      (ctx as Context & { message: { text: string } }).message.text =
        transcription.data;
      await this.deleteFile(`${audioFolderPath}/${ctx.from.id}.mp3`);
      await this.deleteFile(`${audioFolderPath}/${ctx.from.id}.ogg`);
      await this.editMessageText(ctx, sendMessage, '', false, true);

      return await this.streamText(ctx);
    } catch (error) {
      console.error('Error in audioMessage method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке аудиосообщения');
    }
  };

  getVectorVectorStore = async (ctx: Context) => {
    ctx.reply('🔄 Подождите, идет загрузка векторных хранилищ');
    const vectorStoreStatus = await this.assistantService.getAllVectorStore();
    if ('errorMessages' in vectorStoreStatus) {
      return ctx.reply(
        `📂 Не удалось получить доступ к векторному хранилищу ${vectorStoreStatus.errorMessages}`,
      );
    }

    const menu = vectorStoreStatus.data
      .filter((item) => item.name)
      .map((item, index) => {
        let status: string = '';
        if ('activated' in item && item.activated) {
          status = item.activated ? '✅ ' : '';
        }
        return [
          Markup.button.callback(
            `${status}${item.name}`,
            'vector' + (index + 1),
          ),
        ];
      });
    return ctx.reply('Список хранилищ', Markup.inlineKeyboard(menu));
  };

  setVectorStoreSettings = async (ctx: Context) => {
    try {
      const userId = ctx.from.id;
      if ('match' in ctx && Array.isArray(ctx.match)) {
        let lastDigitRegex = ctx.match[0].match(/\d+$/) - 1;

        const vectorStoreStatus =
          await this.assistantService.getAllVectorStore();

        if ('errorMessages' in vectorStoreStatus) {
          return ctx.reply(
            `📂 Не удалось получить доступ к векторному хранилищу ${vectorStoreStatus.errorMessages}`,
          );
        }

        const store = vectorStoreStatus.data[lastDigitRegex];

        const createThreadStatus = await this.assistantService.createThread(
          [store.id],
          `${userId}`,
        );

        if ('errorMessages' in createThreadStatus) {
          return ctx.reply(
            `⚠️ Не удалось создать поток ${createThreadStatus.errorMessages}`,
          );
        }

        return ctx.reply(
          `🚀 Диалог сброшен. 📗Настройки векторного хранилища ${store.name} успешно сохранены`,
        );
      }
    } catch (error) {
      console.error('Error in setVectorStoreSettings method:', error);
      return ctx.reply(
        '⚠️ Произошла ошибка при обработке настроек векторного хранилища',
      );
    }
  };

  private async downloadFile(fileUrl: string, outputLocationPath: string) {
    try {
      const writer = fs.createWriteStream(outputLocationPath);

      const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream',
      });

      return new Promise<{ data: string } | { errorMessages: string }>(
        (resolve, reject) => {
          response.data.pipe(writer);
          let error: null | Error = null;
          writer.on('error', (err) => {
            error = err;
            writer.close();
            reject({ errorMessages: '⚠️ Произошла ошибка при загрузке файла' });
          });
          writer.on('close', () => {
            if (!error) {
              resolve({ data: 'Файл успешно загружен' });
            }
          });
        },
      );
    } catch (error) {
      console.error('Error in downloadFile method:', error);
      throw new Error('⚠️ Произошла ошибка при загрузке файла');
    }
  }

  private splitMessage(message: string, limit = 4096) {
    var parts = [];
    while (message.length > 0) {
      if (message.length > limit) {
        let part = message.slice(0, limit);
        let cutAt = part.lastIndexOf(' ');
        part = part.slice(0, cutAt);
        parts.push(part);
        message = message.slice(cutAt);
      } else {
        parts.push(message);
        message = '';
      }
    }
    return parts;
  }

  private async deleteFile(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
      return { data: 'Файл успешно удален' };
    } catch (error) {
      console.error('Error in deleteFile method:', error);
      return {
        errorMessages: `⚠️ Произошла ошибка при удалении файла ${error}`,
      };
    }
  }

  private async editMessageText(
    ctx: Context,
    oldMessage: Message.TextMessage,
    newMessage: string,
    markdown = false,
    deleteMessage = false,
  ) {
    try {
      if (newMessage.trim() === '') return;
      if (oldMessage.text === newMessage) return;
      if (deleteMessage) {
        await ctx.telegram.deleteMessage(
          oldMessage.chat.id,
          oldMessage.message_id,
        );
        return;
      }
      await ctx.telegram.editMessageText(
        oldMessage.chat.id,
        oldMessage.message_id,
        null,
        newMessage,
        markdown ? { parse_mode: 'Markdown' } : {},
      );
    } catch (error) {
      const errorMessages = `⚠️ Произошла ошибка при редактировании сообщения: ${error.message}`;
      console.error('Error in editMessageText method:', error);
      throw new Error(errorMessages);
    }
  }

  private async covertToMp3(userId?: string) {
    const inputFile = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'audios',
      `${userId}.ogg`,
    );
    const outputFile = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'audios',
      `${userId}.mp3`,
    );

    const convect = await this.oggConverter.convertToMp3(inputFile, outputFile);
    return convect;
  }
}
