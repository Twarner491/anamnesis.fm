import {
  $currentTrack,
  $isPlaying,
  $isPaused,
  $isLoading,
  $volume,
  $isPoweredOn,
  setPlaybackState,
  setLoading,
  setProgress,
  setCurrentTrack,
} from '../stores/player';
import { $queue, skipToNext, addToHistory, addToQueue, clearQueue } from '../stores/queue';
import { $era, $location, $genre } from '../stores/filters';
import { apiUrl } from './config';
import { getTuningSound } from './tuning-sound';
import type { Track, ArchiveMetadata } from '../types';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private isInitialized = false;
  private isFetching = false;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  private isAudioPrimed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.setupEventListeners();
      this.setupFilterSubscription();
      this.setupMediaSession();
    }
  }

  // Set up Media Session API for background playback and lock screen controls
  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    // Set action handlers for media controls
    navigator.mediaSession.setActionHandler('play', () => {
      this.resume();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.playNext();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // We don't have previous track functionality, but handle it gracefully
      // Could potentially play from history in the future
    });

    // Update playback state when our state changes
    $isPlaying.subscribe((playing) => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }
    });
  }

  // Update Media Session metadata with current track info
  private updateMediaSessionMetadata(track: Track) {
    if (!('mediaSession' in navigator)) return;

    const year = track.date ? track.date.substring(0, 4) : '';
    const artist = track.creator || 'Internet Archive';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Track',
      artist: artist,
      album: year ? `${year} • anamnesis.fm` : 'anamnesis.fm',
      artwork: [
        // Use a generic artwork - could be enhanced with track-specific art later
        { src: '/thumb.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }

  private setupFilterSubscription() {
    // Track last known filter values to detect real changes
    let lastEra: string | null = null;
    let lastLocation: string | null = null;
    let lastGenre: string | null = null;
    let retuneTimeout: ReturnType<typeof setTimeout> | null = null;
    let isReady = false;

    const triggerRetune = () => {
      // Only retune if power is on
      if (!$isPoweredOn.get()) {
        console.log('[Retune] Blocked: power off');
        return;
      }

      console.log('[Retune] Triggering with filters:', {
        era: $era.get(),
        location: $location.get(),
        genre: $genre.get()
      });

      // Debounce to avoid multiple rapid retunes
      if (retuneTimeout) clearTimeout(retuneTimeout);
      retuneTimeout = setTimeout(() => {
        this.retune();
      }, 300);
    };

    // Subscribe to era changes
    $era.subscribe((era) => {
      if (!isReady) return;
      if (era !== lastEra) {
        console.log('[Era] Changed:', lastEra, '->', era);
        lastEra = era;
        triggerRetune();
      }
    });

    // Subscribe to location changes
    $location.subscribe((location) => {
      if (!isReady) return;
      if (location !== lastLocation) {
        console.log('[Location] Changed:', lastLocation, '->', location);
        lastLocation = location;
        triggerRetune();
      }
    });

    // Subscribe to genre changes
    $genre.subscribe((genre) => {
      if (!isReady) return;
      if (genre !== lastGenre) {
        console.log('[Genre] Changed:', lastGenre, '->', genre);
        lastGenre = genre;
        triggerRetune();
      }
    });

    // Initialize after a short delay to let persisted stores hydrate
    setTimeout(() => {
      lastEra = $era.get();
      lastLocation = $location.get();
      lastGenre = $genre.get();
      isReady = true;
      console.log('[Filters] Ready with initial values:', { lastEra, lastLocation, lastGenre });
    }, 100);
  }

  // Retune: clear queue and fetch new tracks based on current filters
  async retune() {
    if (!$isPoweredOn.get()) {
      console.log('Retune blocked: power off');
      return;
    }

    console.log('=== RETUNING RADIO ===');
    console.log('Filters:', {
      era: $era.get(),
      location: $location.get(),
      genre: $genre.get()
    });

    // Initialize audio system if not already done
    if (!this.isInitialized) {
      this.initializeAnalyser();
      this.isInitialized = true;
    }

    // Show loading state (triggers tuning sound)
    setLoading(true);

    // Stop current playback
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    // Clear the queue and reset state
    clearQueue();
    setCurrentTrack(null);
    setPlaybackState(false, false);

    // Reset fetching flag and error counter to allow fresh start
    this.isFetching = false;
    this.consecutiveErrors = 0;

    // Fetch fresh tracks with new filters
    await this.fetchMoreTracks();
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('loadstart', () => {
      setLoading(true);
    });

    this.audio.addEventListener('canplay', () => {
      setLoading(false);
    });

    this.audio.addEventListener('playing', () => {
      setPlaybackState(true, false);
    });

    this.audio.addEventListener('pause', () => {
      if (!this.audio?.ended) {
        setPlaybackState(false, true);
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio && this.audio.duration) {
        const progress = this.audio.currentTime / this.audio.duration;
        setProgress(progress, this.audio.currentTime, this.audio.duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setLoading(false);
      // Skip to next on error
      setTimeout(() => this.playNext(), 1000);
    });

    // Sync volume from store
    $volume.subscribe((v) => {
      if (this.audio) this.audio.volume = v;
    });

    // Stop playback when powered off
    $isPoweredOn.subscribe((on) => {
      if (!on && this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }
      // Also stop tuning sound when powered off
      if (!on) {
        try {
          getTuningSound().stop();
        } catch (e) {
          // Ignore if not available
        }
      }
    });

    // Play tuning static when loading
    $isLoading.subscribe((loading) => {
      try {
        if (loading && $isPoweredOn.get()) {
          getTuningSound().start();
        } else {
          getTuningSound().stop();
        }
      } catch (e) {
        // Ignore if tuning sound not available
      }
    });
  }

  // Initialize Web Audio API for visualizer (must be called after user interaction)
  initializeAnalyser(): AnalyserNode | null {
    if (!this.audio || this.analyser) return this.analyser;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      return this.analyser;
    } catch (e) {
      console.error('Failed to initialize audio analyser:', e);
      return null;
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async play(track: Track) {
    if (!this.audio || !$isPoweredOn.get()) return;

    // Check for too many consecutive errors
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.error('Too many consecutive playback errors, stopping');
      setLoading(false);
      setPlaybackState(false, false);
      this.consecutiveErrors = 0; // Reset for next user interaction
      return;
    }

    // Resume AudioContext BEFORE attempting playback (critical for mobile)
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed before playback');
      } catch (e) {
        console.error('Failed to resume AudioContext:', e);
      }
    }

    // Add current track to history before switching
    const current = $currentTrack.get();
    if (current) {
      addToHistory(current);
    }

    setCurrentTrack(track);
    setPlaybackState(true, false);

    // Update lock screen / notification metadata
    this.updateMediaSessionMetadata(track);

    // Construct proxied URL
    const encodedFilename = encodeURIComponent(track.filename);
    const proxyUrl = apiUrl(`api/stream/${track.identifier}/${encodedFilename}`);
    this.audio.src = proxyUrl;

    // Load the audio first (helps on mobile)
    this.audio.load();

    try {
      await this.audio.play();

      // Reset error counter on success
      this.consecutiveErrors = 0;
    } catch (e: any) {
      console.error('Playback failed:', e);

      // Check if it's a user gesture error (NotAllowedError)
      if (e.name === 'NotAllowedError') {
        console.log('Playback blocked - needs user gesture. Will retry on next tap.');
        // Don't count as error - user just needs to tap again
        setPlaybackState(false, false);
        setLoading(false);
        return;
      }

      this.consecutiveErrors++;

      // Only try next track if we haven't hit the limit
      if (this.consecutiveErrors < this.maxConsecutiveErrors) {
        setTimeout(() => this.playNext(), 1000);
      } else {
        console.error('Max errors reached, stopping playback attempts');
        setLoading(false);
      }
    }
  }

  pause() {
    this.audio?.pause();
  }

  async resume() {
    if (!$isPoweredOn.get()) return;

    // Resume AudioContext if suspended (required for mobile)
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (e) {
        console.error('Failed to resume AudioContext:', e);
      }
    }

    if (!this.audio) return;

    try {
      // If there's no source, we need to fetch tracks
      if (!this.audio.src || this.audio.src === '' || this.audio.src === window.location.href) {
        console.log('No audio source, fetching tracks...');
        await this.playNext();
        return;
      }

      await this.audio.play();
    } catch (e: any) {
      console.error('Resume play failed:', e);

      // If blocked by browser policy, inform user
      if (e.name === 'NotAllowedError') {
        console.log('Resume blocked - tap play again');
        setPlaybackState(false, false);
        return;
      }

      // On other errors, try fetching new tracks
      if (!$currentTrack.get()) {
        await this.playNext();
      }
    }
  }

  async toggle() {
    if (!$isPoweredOn.get()) return;

    // CRITICAL: All audio initialization must happen during user gesture on mobile
    // Do this FIRST, synchronously within the gesture handler

    // 1. Initialize audio system if needed
    if (!this.isInitialized) {
      this.initializeAnalyser();
      this.isInitialized = true;
    }

    // 2. Always try to resume AudioContext on EVERY user interaction (mobile requirement)
    // This must happen during the user gesture, not after an await
    if (this.audioContext?.state === 'suspended') {
      // Don't await - fire and continue to not lose the gesture
      this.audioContext.resume().catch(e => {
        console.error('Failed to resume AudioContext:', e);
      });
    }

    // 3. Prime audio element for mobile Safari (must happen during user gesture)
    // This unlocks the audio element for future programmatic playback
    if (this.audio && !this.isAudioPrimed) {
      try {
        // Play silent audio synchronously during gesture
        this.audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        // Use play() without await to start immediately during gesture
        const playPromise = this.audio.play();
        if (playPromise) {
          playPromise.then(() => {
            this.audio?.pause();
            this.isAudioPrimed = true;
            console.log('Audio element primed for mobile playback');
          }).catch(e => {
            // Still mark as primed - the gesture was captured
            this.isAudioPrimed = true;
            console.log('Audio priming partial:', e);
          });
        }
      } catch (e) {
        this.isAudioPrimed = true;
        console.log('Audio priming skipped:', e);
      }
    }

    // Now handle the actual play/pause logic
    if ($isPaused.get()) {
      await this.resume();
    } else if ($isPlaying.get()) {
      this.pause();
    } else {
      // Not playing anything - show loading state immediately for user feedback
      const queue = $queue.get();
      if (queue.length === 0) {
        setLoading(true);
      }
      await this.playNext();
    }
  }

  seek(position: number) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = position * this.audio.duration;
    }
  }

  setVolume(level: number) {
    $volume.set(Math.max(0, Math.min(1, level)));
  }

  async playNext() {
    if (!$isPoweredOn.get()) return;

    const next = skipToNext();

    if (next) {
      await this.play(next);
    } else if (!this.isFetching) {
      // Queue empty - fetch more tracks
      await this.fetchMoreTracks();
    }

    // Refill queue if running low
    if ($queue.get().length < 5 && !this.isFetching) {
      this.fetchMoreTracks();
    }
  }

  // Build search URL with specific filters
  private buildSearchUrl(era: string | null, location: string | null, genre: string | null): string {
    const params = new URLSearchParams();
    if (era) params.set('era', era);
    if (location) params.set('location', location);
    if (genre) params.set('genre', genre);
    const query = params.toString();
    return apiUrl(`api/search${query ? `?${query}` : ''}`);
  }

  // Check if a track's date falls within the selected era
  private isTrackInEra(trackDate: string | undefined, era: string | null): boolean {
    if (!era) return true; // No era filter, all tracks match
    if (!trackDate) return false; // No date on track, can't verify

    const [startYear, endYear] = era.split('-').map(y => parseInt(y, 10));
    if (isNaN(startYear) || isNaN(endYear)) return true;

    // Extract year from various date formats
    const yearMatch = trackDate.match(/(\d{4})/);
    if (!yearMatch) return false;

    const trackYear = parseInt(yearMatch[1], 10);
    return trackYear >= startYear && trackYear <= endYear;
  }

  // Try to fetch items with fallback if no results
  private async fetchWithFallback(): Promise<any[]> {
    const era = $era.get();
    const location = $location.get();
    const genre = $genre.get();

    // Build list of search strategies - NEVER remove era filter if set
    // Only relax location and genre, era must stay strict
    const strategies = era ? [
      // 1. Try with all current filters
      { era, location, genre, label: 'exact match' },
      // 2. Drop location, keep era and genre
      { era, location: null, genre, label: 'without location' },
      // 3. Drop genre, keep era only
      { era, location: null, genre: null, label: 'era only' },
    ] : [
      // If no era selected, progressively relax filters
      { era: null, location, genre, label: 'location and genre' },
      { era: null, location: null, genre, label: 'genre only' },
      { era: null, location, genre: null, label: 'location only' },
      { era: null, location: null, genre: null, label: 'no filters' },
    ];

    for (const strategy of strategies) {
      const searchUrl = this.buildSearchUrl(strategy.era, strategy.location, strategy.genre);

      try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items?.length > 0) {
          console.log(`Found ${data.items.length} items with strategy: ${strategy.label}`);
          return data.items;
        }
        console.log(`No items found with strategy: ${strategy.label}, trying next...`);
      } catch (e) {
        console.error(`Search failed for strategy ${strategy.label}:`, e);
      }
    }

    return [];
  }

  async fetchMoreTracks() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      // Use fallback search to ensure we get results
      const items = await this.fetchWithFallback();

      if (items.length > 0) {
        // Shuffle results for variety
        const shuffled = this.shuffle(items);

        // Get metadata and audio files for first 10 items
        const trackPromises = shuffled.slice(0, 10).map(async (item: any) => {
          try {
            const metaResponse = await fetch(apiUrl(`api/metadata/${item.identifier}`));
            const meta: ArchiveMetadata = await metaResponse.json();

            if (meta.audioFiles?.length > 0) {
              // Filter to only actual audio files (exclude video)
              const validAudioFiles = meta.audioFiles.filter(f => {
                const name = f.name?.toLowerCase() || '';
                return !name.endsWith('.ogv') &&
                       !name.endsWith('.mp4') &&
                       !name.endsWith('.avi') &&
                       !name.endsWith('.mkv') &&
                       !name.endsWith('.webm');
              });

              if (validAudioFiles.length === 0) return null;

              // Pick a random audio file if multiple exist
              const audioFile = validAudioFiles[Math.floor(Math.random() * validAudioFiles.length)];
              return {
                identifier: item.identifier,
                title: meta.title || item.title || item.identifier,
                creator: meta.creator || item.creator,
                date: meta.date || item.date,
                filename: audioFile.name,
                duration: audioFile.duration,
              } as Track;
            }
          } catch (e) {
            console.error(`Failed to get metadata for ${item.identifier}:`, e);
          }
          return null;
        });

        const allTracks = (await Promise.all(trackPromises)).filter(Boolean) as Track[];

        // Filter tracks to only include those matching the selected era
        const selectedEra = $era.get();
        const tracks = allTracks.filter(track => this.isTrackInEra(track.date, selectedEra));

        console.log(`After era validation: ${tracks.length}/${allTracks.length} tracks match era ${selectedEra || 'ALL'}`);

        if (tracks.length > 0) {
          addToQueue(tracks);

          // Start playing if not currently playing
          const currentlyPlaying = $isPlaying.get() || $isPaused.get();
          if (!currentlyPlaying && $isPoweredOn.get()) {
            this.playNext();
          }
        } else {
          // No tracks found after filtering - reset loading state
          console.log('No valid tracks found, resetting loading state');
          setLoading(false);
        }
      } else {
        // No items found at all - reset loading state
        console.log('No items found from search, resetting loading state');
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to fetch tracks:', e);
      // Reset loading state on error
      setLoading(false);
    } finally {
      this.isFetching = false;
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Start the radio (called when user powers on)
  async start() {
    if (!this.isInitialized) {
      this.initializeAnalyser();
      this.isInitialized = true;
    }

    // Resume AudioContext if suspended (required for mobile - must happen during user gesture)
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully');
      } catch (e) {
        console.error('Failed to resume AudioContext:', e);
      }
    }

    // If no tracks in queue, fetch some
    if ($queue.get().length === 0) {
      await this.fetchMoreTracks();
    } else {
      // Resume playback
      await this.playNext();
    }
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (typeof window === 'undefined') {
    throw new Error('AudioManager can only be used in browser');
  }

  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }

  return audioManagerInstance;
}

export type { AudioManager };
