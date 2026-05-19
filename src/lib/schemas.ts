import { z } from 'zod';

export const DeployRequestSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    description: z.string().optional()
  })),
  summary: z.string().optional()
});