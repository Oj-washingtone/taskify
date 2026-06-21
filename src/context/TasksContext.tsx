import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchTasksAsync, addTaskAsync, editTaskAsync, removeTaskAsync, toggleTaskCompletionAsync } from '@/store/tasksSlice';
import { useAuth } from './AuthContext';
import { CreateTaskDto, UpdateTaskDto } from '@/types/task.types';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (user) {
      dispatch(fetchTasksAsync());
    }
  }, [user, dispatch]);

  return <>{children}</>;
}

export function useTasks() {
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector((state: RootState) => state.tasks.tasks);
  const isLoading = useSelector((state: RootState) => state.tasks.isLoading);

  return {
    tasks,
    isLoading,
    fetchTasks: async () => { await dispatch(fetchTasksAsync()).unwrap(); },
    addTask: async (task: CreateTaskDto) => { await dispatch(addTaskAsync(task)).unwrap(); },
    editTask: async (id: string, task: UpdateTaskDto) => { await dispatch(editTaskAsync({ id, taskData: task })).unwrap(); },
    removeTask: async (id: string) => { await dispatch(removeTaskAsync(id)).unwrap(); },
    toggleTaskCompletion: async (id: string, completed: boolean) => { await dispatch(toggleTaskCompletionAsync({ id, completed })).unwrap(); },
  };
}
