export type AuraActionType =
  | "generate_mcp"
  | "sandbox_test"
  | "deploy"
  | "deploy_preview"
  | "github_save"
  | "docs_index"
  | "docs_search"
  | "assistant_chat"
  // Music Layer Phase 1 Actions
  | "play_music"
  | "search_music"
  | "add_to_playlist"
  | "create_playlist"
  | "get_playlists"
  | "get_now_playing"
  | "control_playback";

export interface AuraReceipt<T = any> {
  ok: true;
  action: AuraActionType;
  receipt_id: string;
  timestamp: string;
  result: T;
  evidence?: {
    source?: string;
    endpoint_url?: string;
    repo_url?: string;
    commit_sha?: string;
    file_count?: number;
    logs_count?: number;
    // Music Layer Evidence
    platform?: "youtube" | "spotify" | "itunes";
    user_id?: string;
    device_id?: string;
  };
}

export interface AuraFailure {
  ok: false;
  action: AuraActionType;
  error_code: string;
  message: string;
  timestamp: string;
  recoverable: boolean;
  details?: any;
}

export type AuraApiResponse<T = any> = AuraReceipt<T> | AuraFailure;

// Specific Music result payloads
export interface PlayMusicResult {
  track_id: string;
  title: string;
  artist: string;
  duration_ms: number;
  played_from: string;
}

export interface SearchMusicResult {
  query: string;
  results: {
    track_id: string;
    title: string;
    artist: string;
    duration_ms: number;
    preview_url?: string;
    cover_url?: string;
  }[];
}

export interface AddToPlaylistResult {
  track_id: string;
  playlist_id: string;
  playlist_name: string;
  position: number;
}

export interface CreatePlaylistResult {
  playlist_id: string;
  playlist_name: string;
  description?: string;
  track_count: number;
}

export interface GetPlaylistsResult {
  playlists: {
    playlist_id: string;
    playlist_name: string;
    description?: string;
    track_count: number;
  }[];
}

export interface GetNowPlayingResult {
  track_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_ms: number;
  progress_ms: number;
  is_playing: boolean;
  cover_url?: string;
}

export interface ControlPlaybackResult {
  command: "pause" | "skip" | "previous" | "volume";
  volume_level?: number;
  success: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface AuditFinding {
  endpoint: string;
  flag: string;
  level: "CRITICAL" | "HIGH" | "MEDIUM";
  mitigation: string;
}

export interface AuraRegistryEntry {
  name: string;
  description: string;
  status: string;
  endpoint?: string;
  deployment_mode?: string;
  runtime?: string;
  source_receipt_id?: string;
  updated_at?: string;
  source_repo?: string;
  commit_sha?: string;
}

export interface IntegrationPreset {
  id: string;
  title: string;
  desc: string;
  provider: string;
  docsUrl?: string;
  openApiUrl?: string;
  authType: string;
  status: string;
  statusColor: string;
}
