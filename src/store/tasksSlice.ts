import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createTask as apiCreateTask, deleteTask as apiDeleteTask, updateTask as apiUpdateTask, getTasks } from '@/api/tasks';
import { CreateTaskDto, Task, UpdateTaskDto } from '@/types/task.types';

const META_DELIMITER = '|||META|||';

const encodeTaskData = (taskData: any) => {
  const { isAllDay, endDate, color, description, ...rest } = taskData;
  let newDesc = description || '';
  if (isAllDay !== undefined || endDate !== undefined || color !== undefined) {
    const meta = JSON.stringify({ isAllDay, endDate, color });
    newDesc = `${newDesc}${META_DELIMITER}${meta}`;
  }
  return { ...rest, description: newDesc };
};

const decodeTask = (task: Task): Task => {
  if (!task.description) return task;
  const parts = task.description.split(META_DELIMITER);
  if (parts.length > 1) {
    try {
      const meta = JSON.parse(parts[1]);
      return {
        ...task,
        description: parts[0],
        isAllDay: meta.isAllDay ?? task.isAllDay,
        endDate: meta.endDate ?? task.endDate,
        color: meta.color ?? task.color,
      };
    } catch (e) {
      return task;
    }
  }
  return task;
};

interface OfflineMutation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
  id?: string;
  payload?: any;
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  offlineQueue: OfflineMutation[];
}

const initialState: TasksState = {
  tasks: [],
  isLoading: false,
  error: null,
  offlineQueue: [],
};

import { scheduleTaskReminder } from '@/utils/notifications';

export const fetchTasksAsync = createAsyncThunk('tasks/fetchTasks', async (_, { rejectWithValue }) => {
  try {
    const data = await getTasks();
    return Array.isArray(data) ? data.map(decodeTask) : [];
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || e.message);
  }
});

export const addTaskAsync = createAsyncThunk('tasks/addTask', async (taskData: CreateTaskDto, { rejectWithValue }) => {
  try {
    const encoded = encodeTaskData(taskData);
    const newTask = await apiCreateTask(encoded);
    const decoded = decodeTask(newTask);
    
    if (decoded.dueDate && !decoded.completed) {
      scheduleTaskReminder(decoded.title, decoded.dueDate, !!decoded.isAllDay);
    }
    
    return decoded;
  } catch (e: any) {
    if (e.response && e.response.status >= 400 && e.response.status < 500) {
      return rejectWithValue({ message: e.response.data?.message || e.response.data?.error || 'Validation failed' });
    }
    return rejectWithValue({ isOfflineAction: true, message: 'Saved offline locally' });
  }
});

export const editTaskAsync = createAsyncThunk('tasks/editTask', async ({ id, taskData }: { id: string; taskData: UpdateTaskDto }, { rejectWithValue }) => {
  try {
    const encoded = encodeTaskData(taskData);
    const updated = await apiUpdateTask(id, encoded);
    const decoded = decodeTask(updated);
    
    if (decoded.dueDate && !decoded.completed) {
      scheduleTaskReminder(decoded.title, decoded.dueDate, !!decoded.isAllDay);
    }
    
    return decoded;
  } catch (e: any) {
    if (e.response && e.response.status >= 400 && e.response.status < 500) {
      return rejectWithValue({ message: e.response.data?.message || e.response.data?.error || 'Validation failed' });
    }
    return rejectWithValue({ isOfflineAction: true, message: 'Saved offline locally' });
  }
});

export const removeTaskAsync = createAsyncThunk('tasks/removeTask', async (id: string, { rejectWithValue }) => {
  try {
    await apiDeleteTask(id);
    return id;
  } catch (e: any) {
    if (e.response && e.response.status >= 400 && e.response.status < 500) {
      return rejectWithValue({ message: e.response.data?.message || 'Validation failed' });
    }
    return rejectWithValue({ isOfflineAction: true });
  }
});

export const toggleTaskCompletionAsync = createAsyncThunk('tasks/toggleTaskCompletion', async ({ id, completed }: { id: string; completed: boolean }, { rejectWithValue }) => {
  try {
    await apiUpdateTask(id, { completed });
    return { id, completed };
  } catch (e: any) {
    if (e.response && e.response.status >= 400 && e.response.status < 500) {
      return rejectWithValue({ message: e.response.data?.message || 'Validation failed' });
    }
    return rejectWithValue({ isOfflineAction: true });
  }
});

export const syncOfflineQueueAsync = createAsyncThunk('tasks/syncOfflineQueue', async (_, { getState }) => {
  const state = getState() as any;
  const queue = state.tasks.offlineQueue as OfflineMutation[];
  
  if (queue.length === 0) return;

  for (const mutation of queue) {
    try {
      if (mutation.type === 'CREATE') {
        const encoded = encodeTaskData(mutation.payload);
        await apiCreateTask(encoded);
      } else if (mutation.type === 'UPDATE' && mutation.id) {
        const encoded = encodeTaskData(mutation.payload);
        await apiUpdateTask(mutation.id, encoded);
      } else if (mutation.type === 'DELETE' && mutation.id) {
        await apiDeleteTask(mutation.id);
      } else if (mutation.type === 'TOGGLE' && mutation.id) {
        await apiUpdateTask(mutation.id, mutation.payload);
      }
    } catch (e) {
      console.warn("Failed to sync offline mutation", mutation, e);
    }
  }
  // Optional: Refetch tasks after sync to ensure DB parity
  const data = await getTasks();
  return Array.isArray(data) ? data.map(decodeTask) : [];
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTasksAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasksAsync.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(addTaskAsync.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
      })
      .addCase(addTaskAsync.rejected, (state, action) => {
        const payload = action.payload as any;
        if (payload?.isOfflineAction) {
          // Optimistically add locally with a fake ID
          const fakeTask = { ...action.meta.arg, id: `temp-${Date.now()}` } as Task;
          state.tasks.unshift(fakeTask);
          state.offlineQueue.push({ type: 'CREATE', payload: action.meta.arg });
        }
      })
      .addCase(editTaskAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(editTaskAsync.rejected, (state, action) => {
        const payload = action.payload as any;
        if (payload?.isOfflineAction) {
          const index = state.tasks.findIndex(t => t.id === action.meta.arg.id);
          if (index !== -1) {
            state.tasks[index] = { ...state.tasks[index], ...action.meta.arg.taskData } as Task;
          }
          state.offlineQueue.push({ type: 'UPDATE', id: action.meta.arg.id, payload: action.meta.arg.taskData });
        }
      })
      .addCase(removeTaskAsync.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
      })
      .addCase(removeTaskAsync.rejected, (state, action) => {
        const payload = action.payload as any;
        if (payload?.isOfflineAction) {
          state.tasks = state.tasks.filter(t => t.id !== action.meta.arg);
          state.offlineQueue.push({ type: 'DELETE', id: action.meta.arg });
        }
      })
      // Optimistic update for toggle
      .addCase(toggleTaskCompletionAsync.pending, (state, action) => {
        const { id, completed } = action.meta.arg;
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          task.completed = completed;
        }
      })
      .addCase(toggleTaskCompletionAsync.rejected, (state, action) => {
        const payload = action.payload as any;
        const { id, completed } = action.meta.arg;
        if (payload?.isOfflineAction) {
          // We do NOT revert if it's an offline scenario. Instead we queue it.
          state.offlineQueue.push({ type: 'TOGGLE', id, payload: { completed } });
        } else {
          // Validation/API failure, revert it!
          const task = state.tasks.find(t => t.id === id);
          if (task) {
            task.completed = !completed; // revert
          }
        }
      })
      // Sync Queue
      .addCase(syncOfflineQueueAsync.fulfilled, (state, action) => {
        if (action.payload) {
          state.tasks = action.payload;
          state.offlineQueue = [];
        }
      });
  },
});

export default tasksSlice.reducer;
