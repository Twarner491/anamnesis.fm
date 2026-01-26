// Archive.org API types
export interface ArchiveSearchResult {
  items: ArchiveItem[];
  cursor?: string;
  count: number;
  total: number;
}

export interface ArchiveItem {
  identifier: string;
  title: string;
  date?: string;
  creator?: string;
  coverage?: string;
  subject?: string | string[];
}

export interface ArchiveMetadata {
  identifier: string;
  title: string;
  creator?: string;
  date?: string;
  description?: string;
  coverage?: string;
  subject?: string | string[];
  audioFiles: AudioFile[];
}

export interface AudioFile {
  name: string;
  title?: string;
  duration?: string;
  size?: string;
}

// Player types
export interface Track {
  identifier: string;
  title: string;
  creator?: string;
  date?: string;
  filename: string;
  duration?: string;
  // SoundCloud tracks (Penguin Radio easter egg)
  soundcloudId?: number;
  isPenguinRadio?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  volume: number;
}

// Filter types
export interface FilterState {
  era: string | null;
  location: string | null;
  genre: string | null;
}

export interface EraOption {
  id: string;
  label: string;
  query: string | null;
  position: number; // degrees on dial (0-180)
}

export interface LocationOption {
  id: string;
  label: string;
  query: string | null;
}

export interface GenreOption {
  id: string;
  label: string;
  query: string | null;
}
