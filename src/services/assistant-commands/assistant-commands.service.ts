import { Injectable } from '@nestjs/common';
import { OpenaiAssistantService } from 'src/openai-assistant/openai-assistant.service';
import { Context, Markup } from 'telegraf';

@Injectable()
export class AssistantCommandsService {
  constructor(private assistantService: OpenaiAssistantService) {}

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
    console.log(assistantStatus.data);

    const menu = assistantStatus.data
      .filter((item) => item.name) // Filter out items with empty names
      .map((item, index) => [
        Markup.button.callback(item.name, 'button' + (index + 1)),
      ]);

    return ctx.reply('Список ассистентов', Markup.inlineKeyboard(menu));
  };

  setAsaistantSettings = async (ctx: Context) => {};
}
