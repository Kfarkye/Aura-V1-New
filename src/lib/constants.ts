import { Template } from '../types';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
export const MAX_ATTACHMENTS = 4;
export const MAX_INPUT_LENGTH = 100000;
export const MAX_TASK_LENGTH = 150;
export const CURSOR_THROTTLE_MS = 50;

// Strict MIME type allowlist to prevent SVG XSS injections
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'housing-request',
    title: 'Housing Options Request',
    content: `Hi team!\n\nCan you please send a breakdown of housing options for [Traveler Name]?\n\nStart Date: [Date]\nLength of Contract: [Number] weeks\nPets? (Breed and Weight): [Yes/No]\nWill the traveler have a car?: [Y/N]`
  },
  {
    id: 'margin-approval',
    title: 'Margin Approval',
    content: `LOW MARGIN TEMPLATE\n\nEmail Subject: Margin Approval: Traveler Name – Margin %\nReason needed for approval:\nIs this a New Placement or Extension?`
  }
];
