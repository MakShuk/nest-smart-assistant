import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { ChatCompletionMessageParamType } from './openai/openai.interface';
import * as fs from 'fs';
import { SessionService } from './services/sessions/sessions.service';

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
    const schedule = await fs.promises.readFile(
      'C:/Users/maksh/OneDrive/Documents/ИИ Ассистенты/Создатель Расписаний/Шаблон.md',
      'utf-8',
    );
    const assistMessage = this.ai.createAssistantMessage(schedule);
    const userMessage = this.ai.createUserMessage(
      'Вы созданы для того, чтобы составлять ежедневные расписания и вносить в них необходимые коррективы. Ваша роль заключается чтобы создавать шаблон расписания по уже загруженной информации. Вы должны уделять особое внимание точности.. формат в котом надо создать расписание: Markdown пример задачи в расписании: 7:00 - [обучение], всегда создавай расписание в формате Markdown, не включай фразы:  `## Утро`, `## До обеда` `# Ежедневное Расписание` Убирай из расписания символ " - "',
    );

    const secession = (await this.session.getSession(
      userId,
    )) as ChatCompletionMessageParamType[];

    secession.push(assistMessage);
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
    this.session.saveSession(1, { test: 'test' });
  }
}
