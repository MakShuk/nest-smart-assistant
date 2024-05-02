import { Module } from '@nestjs/common';
import { CreateDailyScheduleService } from './create-daily-schedule.service';
import { CreateDailyScheduleController } from './create-daily-schedule.controller';
import { LoggerService } from 'src/services/logger/logger.service';
import { GoogleTasksApiService } from 'src/google-tasks-api/google-tasks-api.service';
import { OpenaiService } from 'src/openai/openai.service';
import { SessionService } from 'src/services/sessions/sessions.service';

const loggerServiceProvider = {
  provide: LoggerService,
  useValue: new LoggerService('CreateDailySchedule'),
};

@Module({
  controllers: [CreateDailyScheduleController],
  providers: [CreateDailyScheduleService, loggerServiceProvider, GoogleTasksApiService, OpenaiService, SessionService],
})
export class CreateDailyScheduleModule { }
