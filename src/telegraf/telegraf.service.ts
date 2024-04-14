import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from 'src/services/logger/logger.service';
import { message } from 'telegraf/filters';
import { Telegraf, session } from 'telegraf';
import { Context } from 'telegraf';

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
    this.bot.on('photo', (ctx: Context) => {
     this.logger.warn('photo');
     this.logger.warn(ctx.message);
      ctx.reply('🚧 В разработке');
    });
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
