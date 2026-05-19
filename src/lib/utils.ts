import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Sanitizes LLM outputs that improperly wrap JSON in markdown blocks
export const cleanJSON = (str: string): string => {
  return str.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
};
