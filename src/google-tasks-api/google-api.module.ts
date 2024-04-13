import { Module } from '@nestjs/common';
import { GoogleTasksApiService } from './google-tasks-api.service';
import { GoogleTasksApiController } from './google-tasks-api.controller';

@Module({
  controllers: [GoogleTasksApiController],
  providers: [GoogleTasksApiService],
})
export class GoogleApiModule {}
