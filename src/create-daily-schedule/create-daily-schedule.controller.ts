import { Controller, Get } from '@nestjs/common';
import { CreateDailyScheduleService } from './create-daily-schedule.service';

@Controller('create-daily-schedule')
export class CreateDailyScheduleController {
  constructor(private readonly createDailyScheduleService: CreateDailyScheduleService) { }

  @Get()
  async getHello() {
    return await this.createDailyScheduleService.createDailySchedule(305343617);
  }
}
