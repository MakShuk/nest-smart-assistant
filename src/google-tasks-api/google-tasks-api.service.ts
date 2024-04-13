import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, tasks_v1 } from 'googleapis';
import { Request } from 'express';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { promises as fsPromises } from 'fs';

@Injectable()
export class GoogleTasksApiService implements OnModuleInit {
  private oauth2Client: OAuth2Client;
  private tasks: tasks_v1.Tasks;
  private readonly tokensFilePath = 'tokens.json';

  async onModuleInit() {
    console.log('Initializing GoogleTasksApiService...');
    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.YOUR_CLIENT_ID,
        process.env.YOUR_CLIENT_SECRET,
        process.env.YOUR_REDIRECT_URL,
      );

      this.tasks = google.tasks({
        version: 'v1',
        auth: process.env.GOOGLE_API_KEY,
      });

      const tokens = await this.getTokens();

      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
      } else {
        console.log('No tokens found, redirecting to authorization...');
        await this.authorization();
      }
    } catch (error) {
      console.error('Error initializing GoogleTasksApiService:', error);
      throw new Error('Failed to initialize GoogleTasksApiService');
    }
  }

  async authorization() {
    const scopes = ['https://www.googleapis.com/auth/tasks'];
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    console.log('Authorize this app by visiting this url:', url);
    return url;
  }

  async redirect(req: Request) {
    try {
      const code = req.query.code as string;
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveTokens(tokens);
      this.oauth2Client.setCredentials(tokens);
    } catch (error) {
      console.error('Error during authorization:', error);
      throw new Error('Failed to authorize');
    }
  }

  async getEvents() {
    if (!this.oauth2Client.credentials) {
      throw new Error('OAuth2Client has no credentials set');
    }

    const taskLists = await this.tasks.tasklists.list({
      auth: this.oauth2Client,
    });
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

  private async getTokens(): Promise<Credentials | null> {
    try {
      const tokens = await fsPromises.readFile(this.tokensFilePath, 'utf8');
      return JSON.parse(tokens);
    } catch (error) {
      console.error('Error reading tokens:', error);
      return null;
    }
  }
}
