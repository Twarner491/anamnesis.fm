import { atom, computed } from 'nanostores';
import type { Track } from '../types';

// Queue of upcoming tracks
export const $queue = atom<Track[]>([]);

// History of played tracks (most recent first)
export const $history = atom<Track[]>([]);

// Computed: queue length
export const $queueLength = computed($queue, (q) => q.length);

// Computed: has tracks in queue
export const $hasQueue = computed($queue, (q) => q.length > 0);

// Computed: next track preview
export const $nextTrack = computed($queue, (q) => q[0] ?? null);

// Actions
export function addToQueue(tracks: Track[]) {
  $queue.set([...$queue.get(), ...tracks]);
}

export function prependToQueue(tracks: Track[]) {
  $queue.set([...tracks, ...$queue.get()]);
}

export function skipToNext(): Track | null {
  const queue = $queue.get();
  if (queue.length === 0) return null;

  const [next, ...rest] = queue;
  $queue.set(rest);
  return next;
}

export function addToHistory(track: Track) {
  const history = $history.get();
  // Keep last 50 tracks in history
  $history.set([track, ...history].slice(0, 50));
}

export function clearQueue() {
  $queue.set([]);
}

export function clearHistory() {
  $history.set([]);
}

export function shuffleQueue() {
  const queue = [...$queue.get()];
  // Fisher-Yates shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  $queue.set(queue);
}

// Remove a specific track from queue by index
export function removeFromQueue(index: number) {
  const queue = $queue.get();
  if (index >= 0 && index < queue.length) {
    $queue.set([...queue.slice(0, index), ...queue.slice(index + 1)]);
  }
}
