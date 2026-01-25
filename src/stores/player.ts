import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type { Track } from '../types';

// Current track
export const $currentTrack = atom<Track | null>(null);

// Playback state
export const $isPlaying = atom(false);
export const $isPaused = atom(false);
export const $isLoading = atom(false);

// Progress tracking
export const $progress = atom(0); // 0-1
export const $duration = atom(0); // seconds
export const $currentTime = atom(0); // seconds

// Volume (persisted, 0-1) - default to 100%
export const $volume = persistentAtom<number>('radio:volume', 1.0, {
  encode: String,
  decode: Number,
});

// Power state - ON by default
export const $isPoweredOn = atom(true);

// Computed: formatted time display
export const $timeDisplay = computed(
  [$currentTime, $duration],
  (current, duration) => ({
    current: formatTime(current),
    total: formatTime(duration),
    remaining: formatTime(Math.max(0, duration - current)),
  })
);

// Computed: current era display from track date
export const $currentEra = computed($currentTrack, (track) => {
  if (!track?.date) return 'UNKNOWN';
  const year = parseInt(track.date.substring(0, 4), 10);
  if (isNaN(year)) return 'UNKNOWN';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
});

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Actions
export function setCurrentTrack(track: Track | null) {
  $currentTrack.set(track);
}

export function setPlaybackState(playing: boolean, paused: boolean = false) {
  $isPlaying.set(playing);
  $isPaused.set(paused);
}

export function setLoading(loading: boolean) {
  $isLoading.set(loading);
}

export function setProgress(progress: number, currentTime: number, duration: number) {
  $progress.set(progress);
  $currentTime.set(currentTime);
  $duration.set(duration);
}

export function setVolume(volume: number) {
  $volume.set(Math.max(0, Math.min(1, volume)));
}

export function togglePower() {
  $isPoweredOn.set(!$isPoweredOn.get());
}

export function powerOn() {
  $isPoweredOn.set(true);
}

export function powerOff() {
  $isPoweredOn.set(false);
  $isPlaying.set(false);
  $isPaused.set(false);
  $currentTrack.set(null);
}
