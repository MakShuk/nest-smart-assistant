import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { ChatCompletionMessageParamType } from './openai/openai.interface';
import { SessionService } from './services/sessions/sessions.service';
import { Markup } from 'telegraf';
import { CreateDailyScheduleService } from './create-daily-schedule/create-daily-schedule.service';



@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly createDailyScheduleService: CreateDailyScheduleService,
    private readonly task: GoogleTasksApiService,
    private readonly session: SessionService,
  ) { }

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.createCommand('start', this.createDailyScheduleService.start.bind(this.createDailyScheduleService))
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

  async messageAction(userId: number, message: string) {
    try {
      const secession = (await this.session.getSession(
        userId,
      )) as ChatCompletionMessageParamType[];

      secession.push(this.ai.createUserMessage(message));
      const response = await this.ai.response(secession);
      secession.push(this.ai.createAssistantMessage(response.content));
      await this.session.saveSession(userId, secession);

      return response.content;
    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error('Failed to process message');
    }
  }
}

