import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { ChatCompletionMessageParamType } from './openai/openai.interface';
import * as fs from 'fs';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly AssistAI: OpenaiAssistantService,
    private readonly task: GoogleTasksApiService,
  ) {}

  context: ChatCompletionMessageParamType[] = [];

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.createCommand('start', async (ctx) => {
      const message = await this.createDailySchedule();
      ctx.reply(message, {
        parse_mode: 'Markdown',
      });
    });
    this.bot.startBot();
  }
  async createDailySchedule() {
    const schedule = await fs.promises.readFile(
      'C:/Users/maksh/OneDrive/Documents/ИИ Ассистенты/Создатель Расписаний/Шаблон.md',
      'utf-8',
    );
    const assistMessage = this.ai.createAssistantMessage(schedule);
    const userMessage = this.ai.createUserMessage(
      'Вы созданы для того, чтобы составлять ежедневные расписания и вносить в них необходимые коррективы. Ваша роль заключается чтобы создавать шаблон расписания по уже загруженной информации. Вы должны уделять особое внимание точности.. формат в котом надо создать расписание: Markdown пример задачи в расписании: 7:00 - [обучение], всегда создавай расписание в формате Markdown, не включай фразы:  `## Утро`, `## До обеда` `# Ежедневное Расписание`',
    );
    this.context.push(assistMessage);
    this.context.push(userMessage);

    const response = await this.ai.response(this.context);
    this.context.push(this.ai.createAssistantMessage(response.content));
    return response.content;
  }
}
