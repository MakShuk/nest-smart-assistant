import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, tasks_v1 } from 'googleapis';
import { Request } from 'express';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { promises as fsPromises } from 'fs';
import { LoggerService } from 'src/services/logger/logger.service';

@Injectable()
export class GoogleTasksApiService implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}
  private oauth2Client: OAuth2Client;
  private tasks: tasks_v1.Tasks;
  private readonly tokensFilePath = 'tokens.json';

  async onModuleInit() {
    await this.init();
  }

  async init() {
    this.logger.info('Initializing GoogleTasksApiService...');
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
        this.oauth2Client.on('tokens', (updatedTokens) => {
          if (updatedTokens.refresh_token) {
            this.logger.warn('Received new refresh token');
            tokens.refresh_token = updatedTokens.refresh_token;
          }
          tokens.access_token = updatedTokens.access_token;
          tokens.expiry_date = updatedTokens.expiry_date;

          this.saveTokens(tokens);
        });
      } else {
        this.logger.warn('No tokens found, redirecting to authorization...');
        await this.authorization();
      }
    } catch (error) {
      this.logger.error('Error initializing GoogleTasksApiService:', error);
      throw new Error('Failed to initialize GoogleTasksApiService');
    }
  }

  async authorization() {
    const scopes = ['https://www.googleapis.com/auth/tasks'];
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    this.logger.warn('Authorize this app by visiting this url:', url);
    return url;
  }

  async redirect(req: Request) {
    try {
      const code = req.query.code as string;
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveTokens(tokens);
      this.oauth2Client.setCredentials(tokens);
    } catch (error) {
      this.logger.error('Error during authorization:', error);
      throw new Error('Failed to authorize');
    }
  }

  async getAllTaskList() {
    try {
      const taskLists = await this.tasks.tasklists.list({
        auth: this.oauth2Client,
      });
      return taskLists.data.items;
    } catch (error) {
      this.logger.error('Error getting task lists:', error);
      throw new Error('Failed to get task lists');
    }
  }

  async getTasksForList(taskListId: string) {
    try {
      const tasks = await this.tasks.tasks.list({
        tasklist: taskListId,
        auth: this.oauth2Client,
      });
      return tasks.data.items;
    } catch (error) {
      this.logger.error('Error getting tasks:', error.message);
      throw new Error('Failed to get tasks');
    }
  }

  async getCompletedTasksForList(taskListId: string) {
    try {
      const tasks = await this.tasks.tasks.list({
        tasklist: taskListId,
        auth: this.oauth2Client,
        showCompleted: true,
      });
      return tasks.data.items;
    } catch (error) {
      this.logger.error('Error getting tasks:', error.message);
      throw new Error('Failed to get tasks');
    }
  }

  async createTask(taskListId: string, task: tasks_v1.Schema$Task) {
    try {
      const newTask = await this.tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: task,
        auth: this.oauth2Client,
      });
      return newTask.data;
    } catch (error) {
      this.logger.error('Error creating task:', error.message);
      throw new Error('Failed to create task');
    }
  }

  async deletedTask(taskListId: string, taskId: string) {
    try {
      await this.tasks.tasks.delete({
        auth: this.oauth2Client,
        tasklist: taskListId,
        task: taskId,
      });
    } catch (error) {
      this.logger.error('Error deleting task:', error.message);
      throw new Error('Failed to delete task');
    }
  }

  async taskCompleted(taskListId: string, taskId: string) {
    try {
      await this.tasks.tasks.patch({
        auth: this.oauth2Client,
        tasklist: taskListId,
        task: taskId,
        requestBody: {
          status: 'completed',
        },
      });
    } catch (error) {
      this.logger.error('Error completing task:', error.message);
      throw new Error('Failed to complete task');
    }
  }

  private async saveTokens(tokens: Credentials) {
    try {
      await fsPromises.writeFile(
        this.tokensFilePath,
        JSON.stringify(tokens, null, 2),
      );
    } catch (error) {
      this.logger.error('Error saving tokens:', error);
      throw new Error('Failed to save tokens');
    }
  }

  private async getTokens(): Promise<Credentials | null> {
    try {
      const tokens = await fsPromises.readFile(this.tokensFilePath, 'utf8');
      return JSON.parse(tokens) as Credentials;
    } catch (error) {
      this.logger.error('Error reading tokens:', error);
      return null;
    }
  }
}
