import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { LoggerService } from '../logger/logger.service';
import { Injectable } from '@nestjs/common';
import {
  IAssistantSettings,
  settingsStatusType,
} from './assistant-settings.interface';

@Injectable()
export class AssistantSettingsService {
  constructor(private logger: LoggerService) {}
  private saveFolderPath = path.join(__dirname, '..', '..', '..', 'sessions');

  async getAssistantSettings(sessionId: number): Promise<settingsStatusType> {
    try {
      const session = await fsPromises.readFile(
        `${this.saveFolderPath}/a-${sessionId}.json`,
        'utf-8',
      );
      return { data: JSON.parse(session) };
    } catch (error) {
      const errorMessages = `${error.message}`;
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  async saveSettings(userId: number, settings: IAssistantSettings[]) {
    try {
      const folderStatus = await this.ensureDirectoryExists(
        this.saveFolderPath,
      );
      if ('errorMessages' in folderStatus) {
        throw new Error(
          `Error creating directory: ${folderStatus.errorMessages}, path: ${this.saveFolderPath}`,
        );
      }

      await fsPromises.writeFile(
        `${this.saveFolderPath}/a-${userId}.json`,
        JSON.stringify(settings),
        'utf-8',
      );
    } catch (errorMessages) {
      this.logger.error(errorMessages);
      return { errorMessages };
    }
  }

  private async ensureDirectoryExists(directoryPath: string) {
    try {
      await fsPromises.access(directoryPath);
      return { data: 'Directory exists' };
    } catch (accessError) {
      this.logger.error(accessError);
      try {
        await fsPromises.mkdir(directoryPath, { recursive: true });
      } catch (errorMessages) {
        this.logger.error(errorMessages);
        return { errorMessages };
      }
    }
  }
}
