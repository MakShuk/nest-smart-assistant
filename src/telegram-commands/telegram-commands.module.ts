import { Module } from '@nestjs/common';
import { TelegramCommandsService } from './telegram-commands.service';
import { TelegramCommandsController } from './telegram-commands.controller';

@Module({
  controllers: [TelegramCommandsController],
  providers: [TelegramCommandsService],
})
export class TelegramCommandsModule {}
