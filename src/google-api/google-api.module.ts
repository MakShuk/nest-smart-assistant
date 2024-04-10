import { Module } from '@nestjs/common';
import { GoogleApiService } from './google-api.service';
import { GoogleApiController } from './google-api.controller';

@Module({
  controllers: [GoogleApiController],
  providers: [GoogleApiService],
})
export class GoogleApiModule {}
