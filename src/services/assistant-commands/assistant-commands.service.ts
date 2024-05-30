import { Injectable } from '@nestjs/common';
import { OpenaiAssistantService } from 'src/openai-assistant/openai-assistant.service';
import { Context, Markup } from 'telegraf';
import { AssistantSettingsService } from '../assistant-settings/assistant-settings.service';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class AssistantCommandsService {
  constructor(
    private assistantService: OpenaiAssistantService,
    private settings: AssistantSettingsService,
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

  assistantMenu = async (ctx: Context) => {
    try {
      const assistantStatus =
        await this.assistantService.getAllAssistantConfig();

      if ('errorMessages' in assistantStatus) {
        return ctx.reply(
          `📂 Не удалось получить список ассистентов ${assistantStatus.errorMessages}`,
        );
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
        .map((item, index) => [
          Markup.button.callback(item.name, 'button' + (index + 1)),
        ]);

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
        const settingsStatus = await this.settings.getSettings(userId);

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
        ctx.reply('Вы нажали на кнопку ' + lastDigitRegex);
      }
    } catch (error) {
      console.error('Error in setAssistantSettings method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке настроек ассистента');
    }
  };

  text = async (ctx: Context) => {
    try {
      if (!('text' in ctx.message)) return;

      const assistantStatus = await this.settings.getSettings(ctx.from.id);
      if ('errorMessages' in assistantStatus) {
        return ctx.reply(
          `📂 Не удалось получить настройки ассистента ${assistantStatus.errorMessages}`,
        );
      }

      const assistant = assistantStatus.data.find((item) => item.activated);
      if (!assistant) {
        return ctx.reply('⚠️ Ассистент не выбран');
      }

      let threadStatus = await this.assistantService.getAllThread();
      if ('errorMessages' in threadStatus) {
        return ctx.reply(
          `📂 Не удалось получить доступ к потокам ${threadStatus.errorMessages}`,
        );
      }

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

      return ctx.reply(runChatStatus.data);
    } catch (error) {
      console.error('Error in message method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке сообщения');
    }
  };

  reset = async (ctx: Context) => {
    try {
      const newThreadStatus = await this.assistantService.createThread();

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
      const fileId = ctx.message.document.file_id;
      const fileName = ctx.message.document.file_name;
      const userId = ctx.from.id;
      const fileExtension = fileName.split('.').pop();

      const link = await ctx.telegram.getFileLink(fileId);
      const filePath = `./sessions/${userId}.${fileExtension}`;
      await this.downloadFile(`${link}`, filePath);

      return ctx.reply('Файл успешно загружен');
    } catch (error) {
      console.error('Error in file method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке файла');
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

      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error: null | unknown = null;
        writer.on('error', (err) => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error in downloadFile method:', error);
      throw new Error('⚠️ Произошла ошибка при загрузке файла');
    }
  }
}
