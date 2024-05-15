import { Injectable } from '@nestjs/common';


@Injectable()
export class TelegramCommandsService {

  findAll() {
    return `This action returns all telegramCommands`;
  }
}