import { promises as fsPromises } from 'fs';


export class SessionService {
  constructor(private sessionId: string) {}

  private saveFolderPath =
    'C:/development/NextJS/nest-smart-assistant/sessions';

  async getSession(sessionId: number) {
    try {
      const session = await fsPromises.readFile(
        `${this.saveFolderPath}/${sessionId}.json`,
        'utf-8',
      );
      return JSON.parse(session);
    } catch (error) {
      console.error('Session not found');
      return [];
    }
  }

  async saveSession(sessionId: number, sessionData: any) {
    try {
      await this.ensureDirectoryExists(this.saveFolderPath);
      await fsPromises.writeFile(
        `${this.saveFolderPath}/${sessionId}.json`,
        JSON.stringify(sessionData),
        'utf-8',
      );
    } catch (error) {
      console.error('Error writing session:', error);
    }
  }

  private async ensureDirectoryExists(directoryPath: string) {
    try {
      await fsPromises.access(this.saveFolderPath);
    } catch (error) {
      await fsPromises.mkdir(this.saveFolderPath, { recursive: true });
    }
  }
}

