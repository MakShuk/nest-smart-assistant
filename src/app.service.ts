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
import { Stream } from 'openai/streaming';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly log: LoggerService,
    private readonly ai: OpenaiService,
    private readonly createDailyScheduleService: CreateDailyScheduleService,
    private readonly task: GoogleTasksApiService,
    private readonly session: SessionService,
  ) {}

  onModuleInit(): void {
    this.bot.init();
    this.task.init();

    this.bot.createCommand(
      'start',
      this.createDailyScheduleService.start.bind(
        this.createDailyScheduleService,
      ),
    );
    this.bot.createCommand('reset', async (ctx) => {
      await this.session.saveSession(ctx.from.id, []);
      ctx.reply('Сессия сброшена');
    });
    /* 
    this.bot.createCommand('edit', async (ctx) => {
      // Отправляем сообщение
      const message = await ctx.reply('Исходный текст');

      // Изменяем сообщение через 2 секунды
      setTimeout(async () => {
        await ctx.telegram.editMessageText(
          message.chat.id,
          message.message_id,
          null,
          'Измененный текст',
        );
      }, 2000);
    }); */

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

    this.bot.textMessage(async (ctx) => {
      const userId = ctx.from.id;
      if (!('text' in ctx.message)) return;
      const sendMessage = await ctx.reply('Выполняю запрос...', {
        parse_mode: 'Markdown',
      });
      const message = ctx.message?.text;


      let messageContent = '';
      let lastCallTime = Date.now();

      const { yourStream, secession } = await this.messageAction(
        userId,
        message,
      );
      if (yourStream instanceof Stream) {
        //Разбираем ответ на части
        for await (const part of yourStream) {
          const currentTime = Date.now();
          messageContent += part.choices[0]?.delta?.content || '';
          if (currentTime - lastCallTime > 1000) {
            lastCallTime = currentTime;
            await editMessageText(ctx, messageContent);
          }
        }
      }
      await editMessageText(ctx, messageContent, true);
      secession.push(this.ai.createAssistantMessage(messageContent));
      this.session.saveSession(userId, secession);
      this.log.info(messageContent);

      async function editMessageText(
        ctx: any,
        message: string,
        markdown = false,
      ) {
        if (message.trim() === '') return;
        await ctx.telegram.editMessageText(
          sendMessage.chat.id,
          sendMessage.message_id,
          null,
          message,
          {
            parse_mode: markdown ? 'Markdown' : undefined,
          },
        );
      }
    });

    this.bot.startBot();
  }

  async messageAction(userId: number, message: string) {
    try {
      const secession = (await this.session.getSession(
        userId,
      )) as ChatCompletionMessageParamType[];

      secession.push(this.ai.createUserMessage(message));
      const yourStream = await this.ai.streamResponse(secession);
      return { yourStream, secession };
    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error('Failed to process message');
    }
  }
}
