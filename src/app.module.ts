import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { OpenaiModule } from './openai/openai.module';
import { OpenaiAssistantModule } from './openai-assistant/openai-assistant.module';
import { GoogleApiModule } from './google-api/google-api.module';

@Module({
  imports: [ConfigModule.forRoot(), OpenaiModule, OpenaiAssistantModule, GoogleApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
