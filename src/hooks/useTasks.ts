import { useState, useCallback } from 'react';
import { Task } from '../types';
import { generateId } from '../lib/utils';
import { MAX_TASK_LENGTH } from '../lib/constants';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = useCallback((title: string) => {
    setTasks(prev => {
      // Prevent adding duplicate tasks (case-insensitive) that are not completed
      if (prev.some(t => t.title.toLowerCase() === title.toLowerCase() && !t.completed)) return prev; 
      return [...prev, { id: generateId(), title: title.slice(0, MAX_TASK_LENGTH), completed: false, createdAt: Date.now() }];
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTaskTitle = useCallback((id: string, newTitle: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle.slice(0, MAX_TASK_LENGTH) } : t));
  }, []);

  return { tasks, addTask, toggleTask, removeTask, updateTaskTitle };
}
