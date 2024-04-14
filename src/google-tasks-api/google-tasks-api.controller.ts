import { Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { GoogleTasksApiService } from './google-tasks-api.service';
import { Response, Request } from 'express';

@Controller('google-api')
export class GoogleTasksApiController {
  constructor(private readonly GoogleTasksApiService: GoogleTasksApiService) {}

  @Get('login')
  async getAll(@Res() res: Response) {
    const url = await this.GoogleTasksApiService.authorization();
    res.status(302).redirect(url);
  }

  @Get('redirect')
  async getRedirect(@Res() res: Response, @Req() req: Request) {
    console.log('Redirecting...');
    await this.GoogleTasksApiService.redirect(req);
    return res.status(200).send('Redirected');
  }

  @Get('all-tasks-lists')
  async getEvents(@Res() res: Response) {
    const events = await this.GoogleTasksApiService.getAllTaskList();
    res.status(200).send(events);
  }
  @Get('tasks/:taskListId')
  async getEventsForList(@Res() res: Response, @Req() req: Request) {
    const { taskListId } = req.params;
    const events = await this.GoogleTasksApiService.getTasksForList(taskListId);
    res.status(200).send(events);
  }

  @Get('completed-tasks/:taskListId')
  async getCompletedTasksForList(@Res() res: Response, @Req() req: Request) {
    const { taskListId } = req.params;
    const events =
      await this.GoogleTasksApiService.getCompletedTasksForList(taskListId);
    res.status(200).send(events);
  }

  @Post('create-task/:taskListId')
  async createTask(@Res() res: Response, @Req() req: Request) {
    const { taskListId } = req.params;
    const task = req.body;
    const newTask = await this.GoogleTasksApiService.createTask(
      taskListId,
      task,
    );
    return res.status(201).send(newTask);
  }

  @Post('complete-task/:taskListId/:taskId')
  async completeTask(@Res() res: Response, @Req() req: Request) {
    const { taskListId, taskId } = req.params;
    await this.GoogleTasksApiService.taskCompleted(taskListId, taskId);
    return res.status(200).send();
  }

  @Delete('delete-task/:taskListId/:taskId')
  async deleteTask(@Res() res: Response, @Req() req: Request) {
    const { taskListId, taskId } = req.params;
    await this.GoogleTasksApiService.deletedTask(taskListId, taskId);
    return res.status(204).send();
  }
}
