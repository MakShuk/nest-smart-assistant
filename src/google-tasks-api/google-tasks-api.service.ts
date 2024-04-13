import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Request } from 'express';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { promises as fsPromises } from 'fs';

@Injectable()
export class GoogleTasksApiService {
  oauth2Client: OAuth2Client;
  private tokensFilePath = '../../tokens.json';

  async authorization() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUR_CLIENT_ID,
      process.env.YOUR_CLIENT_SECRET,
      process.env.YOUR_REDIRECT_URL,
    );

    const scopes = ['https://www.googleapis.com/auth/tasks'];
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return url;
  }

  async redirect(req: Request) {
    const code = req.query.code as string;
    const { tokens } = await this.oauth2Client.getToken(code);
    await this.saveTokens(tokens);
    this.oauth2Client.setCredentials(tokens);
  }

  async getEvents() {
    if (!this.oauth2Client.credentials) {
      throw new Error('OAuth2Client has no credentials set');
    }

    const calendar = google.calendar({
      version: 'v3',
      auth: process.env.GOOGLE_API_KEY,
    });

    const tasks = google.tasks({
      version: 'v1',
      auth: process.env.GOOGLE_API_KEY,
    });

    const taskLists = await tasks.tasklists.list({ auth: this.oauth2Client });
    console.log(taskLists);
    return taskLists.data.items;
  }

  private async saveTokens(tokens: Credentials) {
    try {
      await fsPromises.writeFile(
        this.tokensFilePath,
        JSON.stringify(tokens, null, 2),
      );
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw new Error('Failed to save tokens');
    }
  }

  private async getTokens() {
    try {
      const tokens = await fsPromises.readFile(this.tokensFilePath, 'utf8');
      return JSON.parse(tokens);
    } catch (error) {
      console.error('Error reading tokens:', error);
      return null;
    }
  }
}
