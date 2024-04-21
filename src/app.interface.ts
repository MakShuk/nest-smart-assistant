export interface IAssistSettings {
  tasklist: ITaskList[];
  prompt: IPromptPath[];
}

export interface ITaskList {
  listName: string;
  listId: string;
}

interface IPromptPath {
  description: string;
  path: string;
}
