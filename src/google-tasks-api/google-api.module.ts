import { Module } from '@nestjs/common';
import { GoogleTasksApiService } from './google-tasks-api.service';
import { GoogleTasksApiController } from './google-tasks-api.controller';
import { LoggerService } from 'src/services/logger/logger.service';


const loggerServiceProvider = {
  provide: LoggerService,
  useValue: new LoggerService('tasks-api'),
};

@Module({
  controllers: [GoogleTasksApiController],
  providers: [GoogleTasksApiService, loggerServiceProvider],
})
export class GoogleApiModule {}
