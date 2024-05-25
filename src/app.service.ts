import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenaiService } from './openai/openai.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { ChatCompletionMessageParamType } from './openai/openai.interface';
import { SessionService } from './services/sessions/sessions.service';
import { Context, Markup } from 'telegraf';
import { Stream } from 'openai/streaming';
import { OggConverter } from './services/converter/ogg-converter.service';
import * as path from 'path';
import * as fs from 'fs';
import { ReadStream } from 'fs';
import axios from 'axios';
import { Update } from 'telegraf/typings/core/types/typegram';
import { CommandsService } from './services/commands/commands';
import { AssistantCommandsService } from './services/assistant-commands/assistant-commands.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly task: GoogleTasksApiService,
    private readonly session: SessionService,
    private oggConverter: OggConverter,
    private command: CommandsService,
    private assistantCommands: AssistantCommandsService,
  ) {}

  onModuleInit(): void {
    this.bot.init();
    this.task.init();
    this.bot.createCommand('start', this.assistantCommands.assistantMenu);
    this.bot.createCommand('reset', this.command.reset);
    this.bot.createCommand('o', this.command.textToSpeech);
    this.bot.createCommand('files', this.assistantCommands.files);
    this.bot.buttonAction(/button[0-9]+/, (ctx) => {
      // ваш код для обработки нажатия кнопки
      if ('match' in ctx && Array.isArray(ctx.match)) {
        console.log(ctx.match[0]);
        let lastDigitRegex = ctx.match[0].match(/\d+$/);
        ctx.reply('Вы нажали на кнопку ' + lastDigitRegex);
      }
    });
    //this.bot.buttonActions(this.command.start, this.assistantCommands.files);
    this.bot.textMessage(this.command.text);
    this.bot.voiceMessage(this.command.audioMessage);
    this.bot.startBot();
  }
}

/*     this.bot.createCommand('test', async (ctx) => {
          console.log(ctx.message);
          return ctx.reply(
            'Режим тестирования',
            Markup.keyboard([['/menu', 'Тест2'], ['Тест 3'], ['УУУ 4']])
              .oneTime()
              .resize()
              .selective(),
          );
        }); */
