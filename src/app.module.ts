import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { OpenaiModule } from './openai/openai.module';
import { OpenaiAssistantModule } from './openai-assistant/openai-assistant.module';
import { GoogleApiModule } from './google-tasks-api/google-api.module';
import { TelegrafModule } from './telegraf/telegraf.module';
import { LoggerService } from './services/logger/logger.service';
import { SessionService } from './services/sessions/sessions.service';
import { OpenaiService } from './openai/openai.service';
import { OpenaiAssistantService } from './openai-assistant/openai-assistant.service';
import { TelegrafService } from './telegraf/telegraf.service';
import { GoogleTasksApiService } from './google-tasks-api/google-tasks-api.service';
import { CreateDailyScheduleModule } from './create-daily-schedule/create-daily-schedule.module';
import { CreateDailyScheduleService } from './create-daily-schedule/create-daily-schedule.service';
import { OggConverter } from './services/converter/ogg-converter.service';
import { TelegramCommandsModule } from './telegram-commands/telegram-commands.module';
import { CommandsService } from './services/commands/commands';
import { AssistantSettingsService } from './services/assistant-settings/assistant-settings.service';
import { AssistantCommandsService } from './services/assistant-commands/assistant-commands.service';

const loggerServiceProvider = {
  provide: LoggerService,
  useValue: new LoggerService('app'),
};

@Module({
  imports: [
    ConfigModule.forRoot(),
    OpenaiModule,
    OpenaiAssistantModule,
    GoogleApiModule,
    TelegrafModule,
    CreateDailyScheduleModule,
    TelegramCommandsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    loggerServiceProvider,
    OpenaiService,
    OpenaiAssistantService,
    GoogleTasksApiService,
    TelegrafService,
    SessionService,
    CreateDailyScheduleService,
    OggConverter,
    CommandsService,
    AssistantCommandsService,
    AssistantSettingsService,
  ],
})
export class AppModule {}
