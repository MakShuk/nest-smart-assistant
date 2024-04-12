import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleApiService {
  oauth2Client: OAuth2Client;

  async start() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUR_CLIENT_ID,
      process.env.YOUR_CLIENT_SECRET,
      process.env.YOUR_REDIRECT_URL,
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
    ];
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return url;
  }

  async redirect(req: Request) {
    const code = req.query.code as string;

    const { tokens } = await this.oauth2Client.getToken(code);
    
    this.oauth2Client.setCredentials(tokens);
    console.log('Tokens:', tokens);
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
}
