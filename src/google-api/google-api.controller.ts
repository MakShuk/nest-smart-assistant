import { Controller } from '@nestjs/common';
import { GoogleApiService } from './google-api.service';

@Controller('google-api')
export class GoogleApiController {
  constructor(private readonly googleApiService: GoogleApiService) {}
}
