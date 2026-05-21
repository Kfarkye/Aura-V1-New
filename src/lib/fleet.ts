/**
 * @file Fleet manifest Zod schema.
 * fleet.json is read-only at runtime. All mutable state (RagCorpusId,
 * LastSyncedAt, LastIngestedSha) lives in Spanner.
 */

import { z } from 'zod';

export const FleetRepoSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  uri: z.string().startsWith('aura://repo/'),
  github: z.object({
    owner: z.string().min(1).max(100),
    repo: z.string().min(1).max(100),
    defaultBranch: z.string().default('main'),
  }),
  engine: z.string().nullable(),
  role: z.enum(['orchestrator', 'engine', 'shared_contracts', 'service']),
  ragCorpusDisplayName: z.string().min(1).max(200),
  ingestion: z.object({
    includePaths: z.array(z.string()),
    excludePaths: z.array(z.string()),
    chunkSize: z.number().int().min(128).max(2048).default(512),
    chunkOverlap: z.number().int().min(0).max(512).default(100),
  }),
});

export const FleetManifestSchema = z.object({
  version: z.string(),
  repositories: z.array(FleetRepoSchema).min(1),
});

export type FleetRepo = z.infer<typeof FleetRepoSchema>;
export type FleetManifest = z.infer<typeof FleetManifestSchema>;
