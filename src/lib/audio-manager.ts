import {
  $currentTrack, $isPlaying, $isPaused, $isLoading, $volume, $isPoweredOn,
  setPlaybackState, setLoading, setProgress, setCurrentTrack,
  setPlaybackError, clearPlaybackError,
} from '../stores/player';
import { $queue, skipToNext, addToHistory, addToQueue, clearQueue } from '../stores/queue';
import { $era, $location, $genre } from '../stores/filters';
import { apiUrl } from './config';
import { isAntarctica } from './constants';
import { getTuningSound } from './tuning-sound';
import type { Track, ArchiveItem, ArchiveMetadata } from '../types';

const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
const MAX_ERRORS = 4;

export class AudioManager {
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserInitialized = false;
  private primed = false;
  private wanted = false;
  private waitingForTrack = false;
  private generation = 0;
  private playback = 0;
  private fetching: Promise<void> | null = null;
  private requests = new AbortController();
  private retuneTimer: ReturnType<typeof setTimeout> | undefined;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;
  private consecutiveErrors = 0;
  private recent: string[] = [];

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.setAttribute('playsinline', '');
    this.audio.setAttribute('data-radio-audio', '');
    this.audio.hidden = true;
    document.body.append(this.audio);
    this.setupEvents();
    for (const store of [$era, $location, $genre]) {
      store.listen(() => this.filtersChanged());
    }
    $volume.subscribe(v => {
      this.audio.volume = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
    });
    $isPoweredOn.listen(on => {
      if (!on) {
        this.wanted = false;
        this.invalidate();
        setLoading(false);
        setPlaybackState(false, false);
      }
    });
    $isLoading.subscribe(loading => {
      const tuning = getTuningSound();
      if (loading && this.wanted && $isPoweredOn.get()) tuning.start();
      else tuning.stop();
    });
    this.setupMediaSession();
  }

  private setupEvents() {
    this.audio.addEventListener('playing', () => {
      if (!$currentTrack.get() || !this.wanted) return;
      clearTimeout(this.loadTimer);
      this.consecutiveErrors = 0;
      setLoading(false);
      clearPlaybackError();
      setPlaybackState(true, false);
    });
    this.audio.addEventListener('pause', () => {
      if ($currentTrack.get() && !this.audio.ended && !$isLoading.get()) {
        setPlaybackState(false, true);
      }
    });
    this.audio.addEventListener('waiting', () => {
      if ($currentTrack.get() && this.wanted) {
        setLoading(true);
        this.armLoadTimeout(this.playback);
      }
    });
    this.audio.addEventListener('timeupdate', () => {
      if (!$currentTrack.get()) return;
      const { currentTime, duration } = this.audio;
      if (Number.isFinite(duration) && duration > 0) {
        setProgress(currentTime / duration, currentTime, duration);
      }
    });
    this.audio.addEventListener('ended', () => {
      if ($currentTrack.get() && this.wanted) void this.playNext();
    });
    this.audio.addEventListener('error', () => {
      if ($currentTrack.get() && this.wanted) this.playbackFailed(this.playback);
    });
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => void this.resume());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => void this.playNext());
    navigator.mediaSession.setActionHandler('stop', () => this.pause());
    $isPlaying.subscribe(playing => {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    });
  }

  initializeAnalyser(): AnalyserNode | null {
    if (this.analyserInitialized) return this.analyser;
    this.analyserInitialized = true;
    // Keep iOS media outside Web Audio so locking the screen doesn't stop it.
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)) return null;
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.audioContext.createMediaElementSource(this.audio).connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Audio visualization unavailable:', error);
    }
    return this.analyser;
  }

  getAnalyser() { return this.analyser; }

  private unlock() {
    this.initializeAnalyser();
    if (this.audioContext?.state === 'suspended') void this.audioContext.resume();
    if (this.primed || $currentTrack.get()) return;
    this.primed = true;
    // Invoke play inside the gesture. Never pause from its asynchronous callback:
    // by then this element may already be playing the requested recording.
    this.audio.src = SILENCE;
    this.audio.loop = true;
    void this.audio.play().catch(() => {});
  }

  private invalidate() {
    this.generation++;
    this.playback++;
    this.requests.abort();
    this.requests = new AbortController();
    this.fetching = null;
    this.waitingForTrack = false;
    clearTimeout(this.retuneTimer);
    clearTimeout(this.loadTimer);
    setCurrentTrack(null);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    clearQueue();
    setProgress(0, 0, 0);
  }

  private filtersChanged() {
    this.invalidate();
    this.consecutiveErrors = 0;
    this.recent = [];
    clearPlaybackError();
    setPlaybackState(false, false);
    setLoading(this.wanted && $isPoweredOn.get());
    this.retuneTimer = setTimeout(() => {
      if (!$isPoweredOn.get()) return;
      if (this.wanted) void this.playNext();
      else void this.fetchMoreTracks();
    }, 250);
  }

  async retune() {
    this.invalidate();
    if (!$isPoweredOn.get()) return;
    this.wanted = true;
    this.consecutiveErrors = 0;
    await this.playNext();
  }

  async toggle() {
    if (!$isPoweredOn.get()) return;
    if (this.wanted && ($isPlaying.get() || $isLoading.get())) {
      this.pause();
      return;
    }
    this.unlock();
    this.consecutiveErrors = 0;
    this.wanted = true;
    clearPlaybackError();
    if ($currentTrack.get() && $isPaused.get()) await this.resume();
    else await this.playNext();
  }

  pause() {
    this.wanted = false;
    this.waitingForTrack = false;
    this.playback++;
    clearTimeout(this.loadTimer);
    this.audio.pause();
    setLoading(false);
    setPlaybackState(false, Boolean($currentTrack.get()));
  }

  async resume() {
    if (!$isPoweredOn.get()) return;
    this.unlock();
    this.wanted = true;
    clearPlaybackError();
    if (!$currentTrack.get()) return this.playNext();
    const token = ++this.playback;
    setLoading(true);
    this.armLoadTimeout(token);
    try {
      await this.audio.play();
    } catch (error) {
      this.playbackFailed(token, error);
    }
  }

  async play(track: Track) {
    if (!$isPoweredOn.get() || !this.wanted) return;
    const token = ++this.playback;
    clearTimeout(this.loadTimer);
    const previous = $currentTrack.get();
    if (previous) addToHistory(previous);
    setCurrentTrack(track);
    setProgress(0, 0, 0);
    setPlaybackState(false, false);
    setLoading(true);
    clearPlaybackError();
    this.recent = [...this.recent.filter(id => id !== track.identifier), track.identifier].slice(-30);
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title, artist: track.creator || 'Internet Archive',
        album: track.isPenguinRadio ? 'Penguin Radio • anamnesis.fm' : 'anamnesis.fm',
      });
    }
    this.audio.loop = false;
    this.audio.src = track.soundcloudId
      ? apiUrl(`api/soundcloud-stream/${track.soundcloudId}`)
      : apiUrl(`api/stream/${encodeURIComponent(track.identifier)}/${encodeURIComponent(track.filename)}`);
    this.armLoadTimeout(token);
    try {
      // Do not wait for canplay: play() itself waits while retaining gesture intent.
      await this.audio.play();
    } catch (error) {
      this.playbackFailed(token, error);
    }
  }

  private armLoadTimeout(token: number) {
    clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => this.playbackFailed(token), 20000);
  }

  private playbackFailed(token: number, error?: unknown) {
    if (token !== this.playback || !this.wanted || !$isPoweredOn.get()) return;
    this.playback++; // Both the media error event and play rejection can fire.
    clearTimeout(this.loadTimer);
    if (error instanceof Error && error.name === 'NotAllowedError') {
      this.pause();
      setPlaybackError('Your browser paused audio. Press play to continue.');
      return;
    }
    if (++this.consecutiveErrors >= MAX_ERRORS) {
      this.pause();
      setCurrentTrack(null);
      setPlaybackState(false, false);
      setPlaybackError('The recordings are unavailable. Press play to retry.');
      return;
    }
    void this.playNext();
  }

  async playNext() {
    if (!$isPoweredOn.get()) return;
    clearTimeout(this.retuneTimer);
    this.wanted = true;
    this.waitingForTrack = false;
    const next = skipToNext();
    if (next) {
      const playing = this.play(next);
      if ($queue.get().length < 3) void this.fetchMoreTracks();
      await playing;
      return;
    }
    this.playback++;
    clearTimeout(this.loadTimer);
    setCurrentTrack(null);
    if (this.audio.src !== SILENCE) this.audio.pause();
    setPlaybackState(false, false);
    setLoading(true);
    this.waitingForTrack = true;
    await this.fetchMoreTracks();
  }

  private async json<T>(path: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(apiUrl(path), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) throw new Error(`Radio API returned ${response.status}`);
    return response.json();
  }

  fetchMoreTracks(): Promise<void> {
    if (this.fetching) return this.fetching;
    const generation = this.generation;
    const signal = this.requests.signal;
    const era = $era.get();
    const location = $location.get();
    const genre = $genre.get();
    const active = () => generation === this.generation && !signal.aborted;
    const enqueue = (track: Track) => {
      if (!active()) return;
      if ($queue.get().some(t => t.identifier === track.identifier && t.filename === track.filename)) return;
      addToQueue([track]);
      if (this.waitingForTrack && this.wanted && $isPoweredOn.get()) {
        this.waitingForTrack = false;
        void this.playNext();
      }
    };
    const fetchTracks = async () => {
      try {
        if (isAntarctica(location)) {
          const data = await this.json<{items: Track[]}>('api/penguin-radio', signal);
          for (const track of this.shuffle(data.items)) enqueue({...track, filename: track.filename || ''});
        } else {
          const params = new URLSearchParams();
          if (era) params.set('era', era);
          if (location) params.set('location', location);
          if (genre) params.set('genre', genre);
          const excluded = [...new Set([...this.recent, ...$queue.get().map(t => t.identifier)])];
          if (excluded.length) params.set('exclude', excluded.join(','));
          const data = await this.json<{items: ArchiveItem[]}>(`api/search?${params}`, signal);
          const items = this.shuffle(data.items).slice(0, 12);
          // Only four metadata requests at a time. Enqueue each as it arrives,
          // so the first recording doesn't wait for the slowest archive item.
          const consume = async () => {
            while (items.length && active()) {
              const item = items.shift()!;
              try {
                const meta = await this.json<ArchiveMetadata>(`api/metadata/${encodeURIComponent(item.identifier)}`, signal);
                if (!active()) return;
                if (era && meta.date) {
                  const year = Number(meta.date.match(/\d{4}/)?.[0]);
                  const [start, end] = era.split('-').map(Number);
                  if (year && (year < start || year > end)) continue;
                }
                const files = meta.audioFiles.filter(f => /\.(mp3|ogg)$/i.test(f.name));
                const mp3 = files.filter(f => /\.mp3$/i.test(f.name));
                const candidates = mp3.length ? mp3 : files;
                const file = candidates[Math.floor(Math.random() * candidates.length)];
                if (file) enqueue({
                  identifier: item.identifier, title: meta.title || item.title,
                  creator: meta.creator || item.creator, date: meta.date || item.date,
                  filename: file.name, duration: file.duration,
                });
              } catch (error) {
                if (active()) console.warn(`Recording unavailable: ${item.identifier}`, error);
              }
            }
          };
          await Promise.all(Array.from({length: Math.min(4, items.length)}, consume));
        }
        if (active() && this.waitingForTrack) {
          this.waitingForTrack = false;
          this.wanted = false;
          setLoading(false);
          setPlaybackError(isAntarctica(location)
            ? 'Penguin Radio is unavailable. Please try again later.'
            : 'No recordings match. Try another era, region, or genre.');
        }
      } catch (error) {
        if (!active()) return;
        if (this.waitingForTrack) {
          this.waitingForTrack = false;
          this.wanted = false;
          setLoading(false);
          setPlaybackError(isAntarctica(location)
            ? 'Penguin Radio is unavailable. Please try again later.'
            : 'Could not reach the archive. Press play to retry.');
        }
      } finally {
        if (active()) this.fetching = null;
      }
    };
    this.fetching = fetchTracks();
    return this.fetching;
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  seek(position: number) {
    if (Number.isFinite(this.audio.duration)) this.audio.currentTime = Math.max(0, Math.min(1, position)) * this.audio.duration;
  }
  setVolume(level: number) { $volume.set(Math.max(0, Math.min(1, level))); }
  async skip() {
    this.unlock();
    this.consecutiveErrors = 0;
    await this.playNext();
  }
  async start() {
    this.unlock();
    this.wanted = true;
    this.consecutiveErrors = 0;
    await this.playNext();
  }
}

let audioManagerInstance: AudioManager | null = null;
export function getAudioManager(): AudioManager {
  if (typeof window === 'undefined') throw new Error('AudioManager requires a browser');
  return audioManagerInstance ??= new AudioManager();
}
