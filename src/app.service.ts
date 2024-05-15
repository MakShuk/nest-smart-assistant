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


@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly task: GoogleTasksApiService,
    private readonly session: SessionService,
    private oggConverter: OggConverter,
    private command: CommandsService
  ) { }

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.createCommand('start', this.command.start,);

    this.bot.createCommand('reset', this.command.reset);

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

    this.bot.createCommand('o', this.command.textToSpeech);

    this.bot.createCommand('menu', async (ctx) => {
      return ctx.reply(
        'Добро пожаловать!',
        Markup.inlineKeyboard([
          [Markup.button.callback('Кнопка 1 и Много текста', 'button1')],
          [Markup.button.callback('Кнопка 1 и Много текста', 'button2')],
          [Markup.button.callback('Кнопка 3', 'button3')],
          [Markup.button.callback('Кнопка 4', 'button4')],
          [Markup.button.callback('Кнопка 5', 'button5')],
          [Markup.button.callback('Кнопка 6', 'button6')],
          [Markup.button.callback('Кнопка 7', 'button7')],
          [Markup.button.callback('Кнопка 8', 'button8')],
          [Markup.button.callback('Кнопка 9', 'button9')],
          [Markup.button.callback('Кнопка 10', 'button10')],
        ]),
      );
    });

    this.bot.textMessage(this.command.text);

    this.bot.voiceMessage(this.command.audioMessage);

    this.bot.startBot();
  }
}
