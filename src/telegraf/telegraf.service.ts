import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/services/logger/logger.service';
import { message } from 'telegraf/filters';
import { Telegraf, session } from 'telegraf';
import { Context } from 'telegraf';
const fs = require('fs');

@Injectable()
export class TelegrafService {
  constructor(private readonly logger: LoggerService) {}
  private bot: Telegraf;
  private botRun: false | Date = false;

  async init() {
    await this.botInit();
    this.logger.info('Telegram Bot initialized');
  }

  async botInit() {
    const botToken = process.env.DEV_BOT_TOKEN;

    if (!botToken) {
      this.logger.error('Ошибка получения токена бота');
      return `Ошибка получения токена бота`;
    }
    this.bot = new Telegraf(botToken);
    this.bot.use(session());
    this.bot.catch((err: any, ctx: Context) => {
      this.logger.error(
        `Ooops, encountered an error for ${ctx.updateType}`,
        err,
      );
    });
    await this.checkUserAccess();
  }

  async startBot() {
    if (this.botRun) {
      this.logger.warn('Бот уже запущен');
      return `Бот уже запущен: ${this.botRun}`;
    }

    this.bot.launch();
    this.logger.info(
      `Бот запущен ${process.env.DEV_MODE === 'true' ? 'в режиме разработки' : ''}`,
    );
    this.botRun = new Date();
    return 'Бот запущен';
  }

  createCommand(command: string, callback: (ctx: Context) => void) {
    this.bot.command(command, callback);
  }

  textMessage(callback: (ctx: Context) => void) {
    this.bot.on(message('text'), callback);
  }

  repostMessage(callback: (ctx: Context) => void) {
    this.bot.on('message', callback);
  }

  imageMessage() {
    const photoMessageFilter = message('photo');
    this.bot.on(photoMessageFilter, (ctx: Context) => {
      this.logger.warn('photo');
      this.logger.warn(ctx.message);
      ctx.reply('🚧 В разработке');
    });
  }

  async voiceMessage(callback: (ctx: Context) => void) {
    this.bot.on(message('voice'), callback);
  }

  async buttonAction(
    action: string | RegExp,
    callback: (ctx: Context) => void,
  ) {
    this.bot.action(action, callback);
  }

  async buttonActions(...callbacks: Function[]) {
    const results = await Promise.all(
      callbacks.map((callback) => {
        this.bot.action(
          'button' + (callbacks.indexOf(callback) + 1),
          callback as any,
        );
      }),
    );
    return results;
  }

  async fileMessage(callback: (ctx: Context) => void) {
    const documentFilter = message('document');
    this.bot.on(documentFilter, callback);
  }

  private async checkUserAccess() {
    this.bot.use(async (ctx: Context, next: () => Promise<void>) => {
      const userId = ctx.from.id;
      const isSuperAdmin = process.env.SUPER_USER_ID === userId.toString();

      this.logger.info(
        `Проверка доступа пользователя ${userId} ${isSuperAdmin ? ' прошла успешно' : 'доступ запрещен'}`,
      );

      if (!isSuperAdmin) {
        ctx.reply(
          `Access denied. You are not registered in the system. Contact the administrator to provide this number: ${userId}`,
        );
        return;
      }
      return next();
    });
  }
}
