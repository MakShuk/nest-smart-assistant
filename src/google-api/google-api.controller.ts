import { Controller, Get, Req, Res } from '@nestjs/common';
import { GoogleApiService } from './google-api.service';
import { Response, Request } from 'express';

@Controller('google-api')
export class GoogleApiController {
  constructor(private readonly googleApiService: GoogleApiService) {}

  @Get('login')
  async getAll(@Res() res: Response) {
    const url = await this.googleApiService.start();
    res.status(302).redirect(url);
  }

  @Get('redirect')
  async getRedirect(@Res() res: Response, @Req() req: Request) {
    console.log('Redirecting...');
    await this.googleApiService.redirect(req);
    return res.status(200).send('Redirected');
  }

  @Get('events')
  async getEvents(@Res() res: Response) {
    const events = await this.googleApiService.getEvents();
    res.status(200).send(events);
  }
}
