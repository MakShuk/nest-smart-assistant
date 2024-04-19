export interface AssistSettings {
  tasklist: ITaskList[];
  prompt: IPromptPath[];
}

interface ITaskList {
  listName: string;
  listId: string;
}

interface IPromptPath {
  description: string;
  path: string;
}
