import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/services/logger/logger.service';
import { IAssistSettings, ITaskList } from './create-daily-schedule.interface';
import * as fs from 'fs';
import { GoogleTasksApiService } from 'src/google-tasks-api/google-tasks-api.service';
import { OpenaiService } from 'src/openai/openai.service';
import { SessionService } from 'src/services/sessions/sessions.service';
import { ChatCompletionMessageParamType } from 'src/openai/openai.interface';



@Injectable()
export class CreateDailyScheduleService {
    constructor(private readonly log: LoggerService,
        private readonly task: GoogleTasksApiService,
        private readonly ai: OpenaiService,
        private readonly session: SessionService,
    ) { }

    async start<T extends { from: { id: number }, reply: (message: string, options?: any) => void }>(ctx: T): Promise<void> {
            const userId = ctx.from.id;
            const message = await this.createDailySchedule(userId);
            this.log.info(message.content);

            if (message.error) {
                    const url = await this.task.authorization()
                    ctx.reply(`Необходимо авторизоваться ${url}`)
                    return null
                }
    
                ctx.reply(message.content, {
                    parse_mode: 'Markdown',
                });
    }

    async createDailySchedule(userId: number) {
        const settings = await this.getSettings();
        const taskList = await this.getAllTaskList();
        const prompt = await this.getMainPrompt(settings);

        if (!Array.isArray(taskList.content) || taskList.error) {
            return { error: true, content: 'Failed to get task lists' }
        };

        const tasks = await this.getTasks(taskList.content);

        if (tasks.error) {
            return { error: true, content: 'Failed to get tasks' }
        }

        const fullPrompt = prompt + '\n' + tasks.content;
        const userMessage = this.ai.createUserMessage(fullPrompt);

        const secession = (await this.session.getSession(
            userId,
        )) as ChatCompletionMessageParamType[];
        await this.session.saveSession(userId, []);
        secession.push(userMessage);

        const response = await this.ai.response(secession);
        secession.push(this.ai.createAssistantMessage(response.content));
        await this.session.saveSession(userId, secession);
        return { error: false, content: response.content };
    }

    private async getSettings(): Promise<IAssistSettings> {
        try {
            const settingsJson = await fs.promises.readFile(
                require('path').join(__dirname, '..', '..', 'configs', 'settings.json'),
                'utf-8',
            );

            const settings = JSON.parse(settingsJson) as IAssistSettings;
            return settings;
        } catch (error) {
            this.log.error('Error reading settings:', error);
            return null;
        }
    }

    private async getAllTaskList() {
        try {
            const taskLists = await this.task.getAllTaskList();
            if (!Array.isArray(taskLists.content) || taskLists.error) {
                throw new Error(`${taskLists.content}`);
            };


            const mappedTaskLists = taskLists.content.map(taskList => {
                return {
                    listName: taskList.title,
                    listId: taskList.id
                } as ITaskList;
            });
            return { error: false, content: mappedTaskLists };
        } catch (error) {
            this.log.error('Error getting task lists:', error);
            return { error: true, content: `Failed to get task lists, ${error}` };
        }
    }

    private async getMainPrompt(settings: IAssistSettings) {
        try {
            const { prompt } = settings;
            let fullPrompt = '';
            for (const path of prompt) {
                let parts = path.path.split('/');

                const folder = parts[0];
                const filename = parts[1];
                const tasks = await fs.promises.readFile(
                    require('path').join(__dirname, '..', '..', folder, filename),
                    'utf-8',
                );;
                fullPrompt += tasks + `: \n`;
            }
            return fullPrompt;
        } catch (error) {
            console.error('Error getting tasks:', error);
            throw new Error('Failed to get tasks');
        }
    }

    private async getTasks(tasklist: ITaskList[]): Promise<{
        error: boolean;
        content: string;
    }> {
        try {

            let fullTask = [];
            for (const list of tasklist) {
                const tasks = await this.task.getTasksForList(list.listId);
                if (!tasks.length) continue;
                const notCompletedTasks = tasks.filter((task) => task.status !== 'completed');
                let task = `[${list.listName}]` + `: \n`;
                for (const taskItem of notCompletedTasks) {
                    task += `- ${taskItem.title}\n`;
                }
                fullTask.push(task);
            }

            const example = `Пример включения задачи в расписание в шаблоне  "14:00 [юмор]".\n Добавленное в расписание "Юмор:Посмотреть видео"`;
            return {
                error: false, content: `${example}\n Список задач для включения в расписание: \n` +
                    fullTask.join('\n')
            };
        } catch (error) {
            this.log.error('Error getting tasks:', error);
            return { error: true, content: 'Failed to get tasks' };
        }
    }

}
