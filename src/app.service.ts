import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegrafService } from './telegraf/telegraf.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { CommandsService } from './services/commands/commands';
import { AssistantCommandsService } from './services/assistant-commands/assistant-commands.service';
import { LoggerService } from './services/logger/logger.service';


@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly bot: TelegrafService,
    private readonly task: GoogleTasksApiService,
    private command: CommandsService,
    private assistantCommands: AssistantCommandsService,
    private logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.logger.info('Инициализация модуля...');
    this.bot.init();
    this.task.init();
    this.registerCommands();
    this.registerActions();
    this.bot.startBot();
    this.logger.info('Бот успешно запущен');
  }

  private registerCommands(): void {
    this.logger.info('Регистрация команд...');
    this.bot.createCommand('start', this.assistantCommands.assistantMenu);
    this.bot.createCommand('reset', this.assistantCommands.reset);
    this.bot.createCommand('o', this.command.textToSpeech);
    this.bot.createCommand('0', this.command.correctText);
    this.bot.createCommand('files', this.assistantCommands.files);
  }

  private registerActions(): void {
    this.logger.info('Регистрация действий...');
    this.bot.buttonAction(
      /button[0-9]+/,
      this.assistantCommands.setAssistantSettings,
    );
    this.bot.voiceMessage(this.assistantCommands.audioMessage);
    this.bot.textMessage(this.assistantCommands.streamText);
    this.bot.fileMessage(this.assistantCommands.file);
  }
}
