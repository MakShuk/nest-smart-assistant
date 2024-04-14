import { Module } from '@nestjs/common';
import { TelegrafService } from './telegraf.service';
import { TelegrafController } from './telegraf.controller';
import { LoggerService } from 'src/services/logger/logger.service';

const loggerServiceProvider = {
  provide: LoggerService,
  useValue: new LoggerService('telegraf'),
};

@Module({
  imports: [],
  controllers: [TelegrafController],
  providers: [TelegrafService, loggerServiceProvider],
  exports: [TelegrafService],
})
export class TelegrafModule {}
