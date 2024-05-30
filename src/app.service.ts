import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { CommandsService } from './services/commands/commands';
import { AssistantCommandsService } from './services/assistant-commands/assistant-commands.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly task: GoogleTasksApiService,
    private command: CommandsService,
    private assistantCommands: AssistantCommandsService,
  ) {}

  onModuleInit(): void {
    this.bot.init();
    this.task.init();
    this.bot.createCommand('start', this.assistantCommands.assistantMenu);
    this.bot.createCommand('reset', this.assistantCommands.reset);
    this.bot.createCommand('o', this.command.textToSpeech);
    this.bot.createCommand('files', this.assistantCommands.files);
    this.bot.buttonAction(
      /button[0-9]+/,
      this.assistantCommands.setAssistantSettings,
    );

    this.bot.voiceMessage(this.command.audioMessage);
    this.bot.textMessage(this.assistantCommands.text);
      this.bot.fileMessage(this.assistantCommands.file);
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
