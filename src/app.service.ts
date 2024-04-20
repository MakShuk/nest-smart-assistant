import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { ChatCompletionMessageParamType } from './openai/openai.interface';
import * as fs from 'fs';
import { SessionService } from './services/sessions/sessions.service';
import { Markup } from 'telegraf';
import { IAssistSettings } from './telegraf/app.interface';


@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly AssistAI: OpenaiAssistantService,
    private readonly task: GoogleTasksApiService,
    private readonly session: SessionService,
  ) {}

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.createCommand('start', async (ctx) => {
      const userId = ctx.from.id;

      const message = await this.createDailySchedule(userId);
      ctx.reply(message, {
        parse_mode: 'Markdown',
      });
    });

    this.bot.createCommand('reset', async (ctx) => {
      await this.session.saveSession(ctx.from.id, []);
      ctx.reply('Сессия сброшена');
    });

    this.bot.createCommand('test', async (ctx) => {
      return ctx.reply(
        'Режим тестирования',
        Markup.keyboard([['/menu', 'Тест2'], ['Тест 3'], ['УУУ 4']])
          .oneTime()
          .resize()
          .selective(),
      );
    });

    this.bot.createCommand('menu', async (ctx) => {
      return ctx.reply(
        'Добро пожаловать!',
        Markup.inlineKeyboard([
          Markup.button.callback('Кнопка 1 и Много текста', 'button1'),
          Markup.button.callback('Кнопка 1 и Много текста', 'button2'),
        ]),
      );
    });

    this.bot.textMessage(async (ctx) => {
      const userId = ctx.from.id;
      if (!('text' in ctx.message)) return;
      const message = ctx.message?.text;
      const response = await this.messageAction(userId, message);
      ctx.reply(response, {
        parse_mode: 'Markdown',
      });
    });
    this.bot.startBot();
  }

  async createDailySchedule(userId: number) {
    const settings = await this.getSettings();
    const prompt = await this.getMainPrompt(settings);
    const tasks = await this.getTasks(settings);

    const fullPrompt = prompt + '\n' + tasks;
    const userMessage = this.ai.createUserMessage(fullPrompt);

    const secession = (await this.session.getSession(
      userId,
    )) as ChatCompletionMessageParamType[];
    await this.session.saveSession(userId, []);

    secession.push(userMessage);

    const response = await this.ai.response(secession);
    secession.push(this.ai.createAssistantMessage(response.content));
    await this.session.saveSession(userId, secession);
    return response.content;
  }

  async messageAction(userId: number, message: string) {
    const secession = (await this.session.getSession(
      userId,
    )) as ChatCompletionMessageParamType[];

    secession.push(this.ai.createUserMessage(message));
    const response = await this.ai.response(secession);
    secession.push(this.ai.createAssistantMessage(response.content));
    await this.session.saveSession(userId, secession);

    return response.content;
  }

  async test() {
    try {
      const { prompt } = await this.getSettings();
      let fullPrompt = '';
      for (const path of prompt) {
        const tasks = await fs.promises.readFile(path.path, 'utf-8');
        fullPrompt += tasks + `: \n`;
      }

      return fullPrompt;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  private async getSettings(): Promise<IAssistSettings> {
    try {
      const settingsJson = await fs.promises.readFile(
        require('path').join(__dirname, '..', 'configs', 'settings.json'),
        'utf-8',
      );
      const settings = JSON.parse(settingsJson) as IAssistSettings;
      return settings;
    } catch (error) {
      this.log.error('Error reading settings:', error);
      return null;
    }
  }

  async getMainPrompt(settings: IAssistSettings) {
    try {
      const { prompt } = settings;
      let fullPrompt = '';
      for (const path of prompt) {
        const tasks = await fs.promises.readFile(path.path, 'utf-8');
        fullPrompt += tasks + `: \n`;
      }
      return fullPrompt;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  async getTasks(settings: IAssistSettings) {
    try {
      const { tasklist } = settings;
      let fullTask = [];
      for (const list of tasklist) {
        const tasks = await this.task.getTasksForList(list.listId);
        if (!tasks.length) continue;
        const notCompletedTasks = tasks.filter((task) => task.status !== 'completed');
        let task = `[${list.listName}]` + `: \n`;
        for (const taskItem of notCompletedTasks) {
          task += `- ${taskItem.title}\n`;
        }
        fullTask.push(task);
      }
      const example = `Пример включения задачи в расписание в шаблоне  "14:00 [юмор]".\n Добавленное в расписание "Юмор:Посмотреть видео"`;
      return (
        `${example}\n Список задач для включения в расписание: \n` +
        fullTask.join('\n')
      );
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }
}
