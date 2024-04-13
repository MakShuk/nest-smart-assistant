import { Controller, Get, Req, Res } from '@nestjs/common';
import { GoogleTasksApiService } from './google-tasks-api.service';
import { Response, Request } from 'express';

@Controller('google-api')
export class GoogleTasksApiController {
  constructor(private readonly GoogleTasksApiService: GoogleTasksApiService) {}

  @Get('login')
  async getAll(@Res() res: Response) {
    const url = await this.GoogleTasksApiService.authorization();
    res.status(302).redirect(url);
  }

  @Get('redirect')
  async getRedirect(@Res() res: Response, @Req() req: Request) {
    console.log('Redirecting...');
    await this.GoogleTasksApiService.redirect(req);
    return res.status(200).send('Redirected');
  }

  @Get('events')
  async getEvents(@Res() res: Response) {
    const events = await this.GoogleTasksApiService.getEvents();
    res.status(200).send(events);
  }
}
