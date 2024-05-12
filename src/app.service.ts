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

    this.bot.createCommand('o', async (ctx) => {
      this.bot.sendAudioMessage(ctx)
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

    this.bot.textMessage(this.command.text);

    this.bot.voiceMessage(this.command.audioMessage);

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

  async audioMessage(ctx: Context<Update>) {
    if (!('voice' in ctx.message)) return;
    const fileId = ctx.message.voice?.file_id;
    const userId = ctx.from.id;
    const sendMessage = await ctx.reply('Выполняю аудио запрос...', {
      parse_mode: 'Markdown',
    });
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const response = await axios({
      method: 'get',
      url: String(fileLink),
      responseType: 'stream',
    });
    const dir = './audios';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const writer = fs.createWriteStream(`./audios/${userId}.ogg`);

    try {
      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log('Аудио сообщение сохранено');
    } catch (error) {
      console.log('Ошибка при сохранении аудио сообщения:', error);
    }
    await this.covertToMp3(String(userId));

    const readStream = fs.createReadStream(`./audios/${userId}.mp3`);

    const transcription = await this.ai.transcriptionAudio(readStream);

    let messageContent = '';
    let lastCallTime = Date.now();

    const { yourStream, secession } = await this.messageAction(userId, transcription.content);

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



  }

  async covertToMp3(userId?: string) {
    const inputFile = `C:/development/NextJS/nest-smart-assistant/audios/${userId}.ogg`;
    const outputFile =
      `C:/development/NextJS/nest-smart-assistant/audios/${userId}.mp3`;
    return await this.oggConverter.convertToMp3(inputFile, outputFile);
  }
}
