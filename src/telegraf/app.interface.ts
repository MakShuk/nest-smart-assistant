export interface AssistSettings {
  tasklist: ITaskList[];
  prompt: IPromptPath[];
}

interface ITaskList {
  listName: string;
  listId: number;
}

interface IPromptPath {
  description: string;
  path: string;
}
