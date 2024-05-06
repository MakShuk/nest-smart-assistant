import { Controller, Get} from '@nestjs/common';
import { TelegramCommandsService } from './telegram-commands.service';

@Controller('telegram-commands')
export class TelegramCommandsController {
  constructor(private readonly telegramCommandsService: TelegramCommandsService) { }


  @Get()
  findAll() {
    return this.telegramCommandsService.findAll();
  }
}