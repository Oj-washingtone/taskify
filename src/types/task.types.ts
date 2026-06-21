export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
}
