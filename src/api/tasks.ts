import { CreateTaskDto, Task, UpdateTaskDto } from "@/types/task.types";
import { api } from "./client";

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get("/tasks");
  return data.tasks || data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get(`/tasks/${id}`);
  return data.task || data;
}

export async function createTask(taskData: CreateTaskDto): Promise<Task> {
  const { data } = await api.post("/tasks", taskData);
  return data.task || data;
}

export async function updateTask(
  id: string,
  taskData: UpdateTaskDto,
): Promise<Task> {
  const { data } = await api.put(`/tasks/${id}`, taskData);
  return data.task || data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
