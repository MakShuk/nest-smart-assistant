import { Injectable } from '@nestjs/common';
import { IBotContext } from './commands.interface';
import { OpenaiService } from 'src/openai/openai.service';
import { Stream } from 'openai/streaming';
import { Context, session } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import { SessionService } from 'src/services/sessions/sessions.service';
import { ChatCompletionMessageParam } from 'openai/resources';
import axios from 'axios';
import * as fs from 'fs';
import { OggConverter } from '../converter/ogg-converter.service';
import * as path from 'path';

@Injectable()
export class CommandsService {
  constructor(
    private openAiService: OpenaiService,
    private sessionService: SessionService,
    private oggConverter: OggConverter,
  ) {}

  start = (ctx: IBotContext) => {
    this.clearSession(ctx);
    ctx.reply(
      '🤖 Привет! Я здесь, чтобы помочь вам. Задайте мне любой вопрос, и я постараюсь на него ответить. Давайте начнем!',
    );
  };

  correctText = async (ctx: Context) => {
    try {
      if (!('text' in ctx.message)) return;
      const message = `Исправь ошибки и расставь пунктуацию верни только исправленный текст: ${ctx.message?.text}`;
      const responseMessage = this.openAiService.createUserMessage(message);
      const sendResponse = await this.openAiService.response([responseMessage]);
      if (sendResponse.error)
        return ctx.reply(`Ошибка при исправлении ${sendResponse.content}`);
      ctx.reply(sendResponse.content);
    } catch (error) {
      console.error('Error in message method:', error);
      return ctx.reply('⚠️ Произошла ошибка при обработке сообщения');
    }
  };

  reset = (ctx: IBotContext) => {
    this.clearSession(ctx);
    ctx.reply('⤵️ Контекст сброшен, диалог начат заново');
  };

  text = async (ctx: IBotContext) => {
    try {
      if (!('text' in ctx.message)) return;
      const message = ctx.message?.text;
      await this.streamMessage(ctx, message);
    } catch (error) {
      this.handleError(error, ctx);
    }
  };

  audioMessage = async (
    ctx: IBotContext,
    mode: 'text' | 'request' = 'request',
  ) => {
    if (!('voice' in ctx.message)) return;
    const fileId = ctx.message.voice?.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const userId = ctx.from.id;

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

    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await this.covertToMp3(String(userId));

    const readStream = fs.createReadStream(`./audios/${userId}.mp3`);

    const transcription =
      await this.openAiService.transcriptionAudio(readStream);

    if (mode === 'text') {
      return transcription.content;
    }
    return await this.streamMessage(ctx, transcription.content);
  };

  textToSpeech = async (ctx: IBotContext) => {
    const userId = ctx.from.id;
    if (!('text' in ctx.message)) return;
    this.clearSession(ctx);
    const message = ctx.message?.text;
    const commandRemoved = message.replace('/o ', '');
    ctx.reply('🔊 Сообщение преобразуется в аудио');
    const bufferStatus = await this.openAiService.textToSpeech(commandRemoved);
    if ('buffer' in bufferStatus) {
      const filePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'audios',
        `${userId}.mp3`,
      );
      await fs.promises.writeFile(filePath, bufferStatus.buffer);
    } else {
      ctx.reply(bufferStatus.content);
      return;
    }

    const firstWord = commandRemoved.split(' ')[0];
    const filePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'audios',
      `${userId}.mp3`,
    );
    const stream = fs.createReadStream(filePath);
    ctx.replyWithAudio({ source: stream, filename: `${firstWord}.mp3` });
  };

  private async streamMessage(ctx: IBotContext, message: string) {
    try {
      const sendMessage = await ctx.reply(
        '🔄 Подождите, идет обработка запроса...',
      );

      const session: ChatCompletionMessageParam[] =
        await this.sessionService.getSession(ctx.from.id);
      session.push(this.openAiService.createUserMessage(message));

      const streamResponse = await this.openAiService.streamResponse(session);

      if ('error' in streamResponse) {
        ctx.reply(streamResponse.content);
        return;
      }

      let messageContent = '';

      if (streamResponse instanceof Stream) {
        let lastCallTime = Date.now();
        for await (const part of streamResponse) {
          const currentTime = Date.now();
          messageContent += part.choices[0]?.delta?.content || '';
          if (currentTime - lastCallTime > 1000) {
            lastCallTime = currentTime;
            await this.editMessageText(ctx, sendMessage, messageContent);
          }
        }

        await this.editMessageText(ctx, sendMessage, messageContent, true);
        session.push(this.openAiService.createAssistantMessage(messageContent));
        this.sessionService.saveSession(ctx.from.id, session);
      }
    } catch (error) {
      console.error(error);
      this.handleError(error, ctx);
    }
  }

  private async covertToMp3(userId?: string) {
    const inputFile = path.join(__dirname, '..', '..', '..', 'audios', `${userId}.ogg`);
    const outputFile = path.join(__dirname, '..', '..', '..', 'audios', `${userId}.mp3`);
    return await this.oggConverter.convertToMp3(inputFile, outputFile);
  }

  private handleError = async (error: any, ctx: IBotContext) => {
    console.error(error);
    await ctx.reply('⚠️ Произошла ошибка. Попробуйте еще раз.');
  };

  private async editMessageText(
    ctx: Context,
    oldMessage: Message.TextMessage,
    newMessage: string,
    markdown = false,
  ) {
    if (newMessage.trim() === '') return;
    await ctx.telegram.editMessageText(
      oldMessage.chat.id,
      oldMessage.message_id,
      null,
      newMessage,
      {
        parse_mode: markdown ? 'Markdown' : undefined,
      },
    );
  }

  private clearSession = (ctx: IBotContext) =>
    this.sessionService.saveSession(ctx.from.id, []);
}
