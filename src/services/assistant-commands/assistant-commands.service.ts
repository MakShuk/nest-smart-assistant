import { Injectable } from '@nestjs/common';
import { OpenaiAssistantService } from 'src/openai-assistant/openai-assistant.service';
import { Context, Markup } from 'telegraf';
import { AssistantSettingsService } from '../assistant-settings/assistant-settings.service';

@Injectable()
export class AssistantCommandsService {
  constructor(
    private assistantService: OpenaiAssistantService,
    private settings: AssistantSettingsService,
  ) {}

  files = async (ctx: Context) => {
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
  };

  assistantMenu = async (ctx: Context) => {
    const assistantStatus = await this.assistantService.getAllAssistantConfig();

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
  };

  setAssistantSettings = async (ctx: Context) => {
    const userId = ctx.from.id;
    if ('match' in ctx && Array.isArray(ctx.match)) {
      let lastDigitRegex = ctx.match[0].match(/\d+$/) - 1;
      const settingsStatus = await this.settings.getSettings(userId);

      if ('errorMessages' in settingsStatus) {
        return ctx.reply(
          `📂 Не удалось получить настройки ассистента ${settingsStatus.errorMessages}`,
        );
      }

      if (lastDigitRegex >= 0 && lastDigitRegex < settingsStatus.data.length) {
        settingsStatus.data[lastDigitRegex].activated = true;
      }

      const saveSettingsStatus = this.settings.saveSettings(
        userId,
        settingsStatus.data,
      );
      if ('errorMessages' in saveSettingsStatus) {
        return ctx.reply(
          `📂 Не удалось сохранить настройки ассистента ${saveSettingsStatus.errorMessages}`,
        );
      }
      ctx.reply('Вы нажали на кнопку ' + lastDigitRegex);
    }
  };
}
