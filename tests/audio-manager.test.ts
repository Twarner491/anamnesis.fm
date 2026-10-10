import { beforeEach, afterEach, expect, it, vi } from 'vitest';

vi.mock('@nanostores/persistent', async () => {
  const {atom} = await import('nanostores');
  return {persistentAtom: (_key: string, value: unknown) => atom(value)};
});
vi.mock('../src/lib/config', () => ({apiUrl: (path: string) => `/${path}`}));
vi.mock('../src/lib/tuning-sound', () => ({getTuningSound: () => ({start() {}, stop() {}})}));

class FakeAudio extends EventTarget {
  static instance: FakeAudio;
  src = ''; loop = false; paused = true; ended = false; duration = 100; currentTime = 0;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
  });
  pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')); });
  load() {}
  setAttribute() {}
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
  constructor() { super(); FakeAudio.instance = this; }
}
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {resolve = r;});
  return {promise, resolve};
};
const response = (body: unknown) => Response.json(body);
const track = (id: string) => ({identifier: id, title: id, filename: `${id}.mp3`});
let manager: import('../src/lib/audio-manager').AudioManager;
let player: typeof import('../src/stores/player');
let queue: typeof import('../src/stores/queue');
let filters: typeof import('../src/stores/filters');

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', {userAgent: 'iPhone', maxTouchPoints: 1});
  vi.stubGlobal('document', {querySelector: vi.fn(() => null), body: {append: vi.fn()}});
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('fetch', vi.fn(async () => response({items: []})));
  player = await import('../src/stores/player');
  queue = await import('../src/stores/queue');
  filters = await import('../src/stores/filters');
  const {AudioManager} = await import('../src/lib/audio-manager');
  manager = new AudioManager();
});
afterEach(() => { manager.pause(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('starts the first fetched recording on one gesture, without priming pausing it', async () => {
  vi.mocked(fetch).mockImplementation(async url => String(url).includes('metadata')
    ? response({title: 'A', audioFiles: [{name: 'a.mp3'}]})
    : response({items: [{identifier: 'a', title: 'A'}]}));
  await manager.toggle();
  expect(player.$currentTrack.get()?.identifier).toBe('a');
  expect(player.$isPlaying.get()).toBe(true);
  expect(FakeAudio.instance.paused).toBe(false);
  expect(FakeAudio.instance.loop).toBe(false);
});

it('plays a prepared track immediately and ignores late priming completion', async () => {
  const prime = deferred<void>();
  FakeAudio.instance.play.mockImplementationOnce(() => prime.promise);
  queue.addToQueue([track('ready')]);
  await manager.toggle();
  prime.resolve();
  await Promise.resolve();
  expect(player.$isPlaying.get()).toBe(true);
  expect(FakeAudio.instance.paused).toBe(false);
});

it('starts on the first metadata response, without waiting for a slow one', async () => {
  const slow = deferred<Response>();
  vi.mocked(fetch).mockImplementation(async url => {
    if (String(url).includes('metadata/slow')) return slow.promise;
    if (String(url).includes('metadata/fast')) return response({audioFiles: [{name: 'fast.mp3'}]});
    return response({items: [track('slow'), track('fast')]});
  });
  const starting = manager.toggle();
  await vi.advanceTimersByTimeAsync(0);
  expect(player.$currentTrack.get()?.identifier).toBe('fast');
  expect(player.$isPlaying.get()).toBe(true);
  slow.resolve(response({audioFiles: []}));
  await starting;
});

it('discards old search responses after changing stations', async () => {
  const old = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(old.promise);
  const pending = manager.fetchMoreTracks();
  filters.$location.set('Antarctica');
  old.resolve(response({items: [track('stale')]}));
  await pending;
  expect(queue.$queue.get()).toEqual([]);
  expect(player.$currentTrack.get()).toBeNull();
});

it('does not resume when a pending request completes after power off', async () => {
  const old = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(old.promise);
  const pending = manager.toggle();
  player.powerOff();
  old.resolve(response({items: [track('stale')]}));
  await pending;
  expect(player.$isPlaying.get()).toBe(false);
  expect(player.$isLoading.get()).toBe(false);
  expect(queue.$queue.get()).toEqual([]);
  expect(FakeAudio.instance.src).toBe('');
});

it('a second click cancels loading and late results do not autoplay', async () => {
  const pendingSearch = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(pendingSearch.promise).mockResolvedValue(response({audioFiles: [{name:'a.mp3'}]}));
  const starting = manager.toggle();
  await manager.toggle();
  pendingSearch.resolve(response({items: [track('a')]}));
  await starting;
  expect(player.$isPlaying.get()).toBe(false);
  expect(player.$isLoading.get()).toBe(false);
  expect(FakeAudio.instance.paused).toBe(true);
});

it('resumes the current recording without replacing it with silence', async () => {
  queue.addToQueue([track('a')]);
  await manager.toggle();
  manager.pause();
  const src = FakeAudio.instance.src;
  await manager.toggle();
  expect(FakeAudio.instance.src).toBe(src);
  expect(player.$isPlaying.get()).toBe(true);
});

it('does not autoplay a station selection before the first play gesture', async () => {
  filters.$location.set('Antarctica');
  vi.mocked(fetch).mockResolvedValue(response({items: [{...track('penguin'), soundcloudId: 123}]}));
  await vi.advanceTimersByTimeAsync(250);
  expect(queue.$queue.get()).toHaveLength(1);
  expect(FakeAudio.instance.play).not.toHaveBeenCalled();
});

it('reports empty stations instead of silently dropping the selected region', async () => {
  filters.$location.set('Asia');
  await manager.toggle();
  expect(player.$playbackError.get()).toMatch(/No recordings match/);
  expect(player.$isLoading.get()).toBe(false);
  expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).includes('location=Asia'))).toBe(true);
});

it('rejects metadata outside the requested era', async () => {
  filters.$era.set('1930-1939');
  vi.mocked(fetch).mockImplementation(async url => String(url).includes('metadata')
    ? response({date: '2005', audioFiles: [{name: 'wrong.mp3'}]})
    : response({items: [track('wrong')]}));
  await manager.toggle();
  expect(player.$currentTrack.get()).toBeNull();
  expect(queue.$queue.get()).toEqual([]);
});

it('stops after bounded failures instead of skipping forever', async () => {
  queue.addToQueue(['a','b','c','d','e'].map(track));
  FakeAudio.instance.play.mockImplementation(async () => {throw new DOMException('failed','NotSupportedError');});
  await manager.toggle();
  await vi.advanceTimersByTimeAsync(0);
  expect(player.$playbackError.get()).toMatch(/unavailable/);
  expect(player.$isLoading.get()).toBe(false);
  expect(FakeAudio.instance.play.mock.calls.length).toBeLessThanOrEqual(5);
});

it('deduplicates the error event and rejection from the same play attempt', async () => {
  queue.addToQueue(['a','b','c'].map(track));
  FakeAudio.instance.play.mockImplementationOnce(async () => {}) // priming
    .mockImplementationOnce(async () => {
      FakeAudio.instance.dispatchEvent(new Event('error'));
      throw new DOMException('failed','NotSupportedError');
    });
  await manager.toggle();
  await vi.advanceTimersByTimeAsync(0);
  expect(player.$currentTrack.get()?.identifier).toBe('b');
});

it('ignores metadata that arrives after retuning, even when fetch ignores abort', async () => {
  const old = deferred<Response>();
  vi.mocked(fetch).mockImplementation(async url => String(url).includes('metadata') ? old.promise : response({items:[track('old')]}));
  const pending = manager.toggle();
  await vi.advanceTimersByTimeAsync(0);
  filters.$location.set('Antarctica');
  old.resolve(response({audioFiles:[{name:'old.mp3'}]}));
  await pending;
  expect(queue.$queue.get()).toEqual([]);
  expect(player.$currentTrack.get()).toBeNull();
});

it('keeps user-blocked audio loaded for the next gesture', async () => {
  queue.addToQueue([track('a')]);
  FakeAudio.instance.play.mockImplementationOnce(async () => {})
    .mockRejectedValueOnce(new DOMException('gesture required','NotAllowedError'));
  await manager.toggle();
  expect(player.$isPaused.get()).toBe(true);
  expect(player.$currentTrack.get()?.identifier).toBe('a');
  await manager.toggle();
  expect(player.$isPlaying.get()).toBe(true);
});

it('keeps gesture-priming audio alive while the initial search is pending', async () => {
  const search = deferred<Response>();
  vi.mocked(fetch).mockReturnValue(search.promise);
  const starting = manager.toggle();
  expect(FakeAudio.instance.pause).not.toHaveBeenCalled();
  search.resolve(response({items:[]}));
  await starting;
});

it('reuses the layout audio element so page navigation can preserve playback', async () => {
  const audio = FakeAudio.instance;
  Object.assign(audio, {isConnected: true});
  vi.mocked(document.querySelector).mockReturnValue(audio as unknown as Element);
  vi.mocked(document.body.append).mockClear();
  const {AudioManager} = await import('../src/lib/audio-manager');
  new AudioManager();
  expect(FakeAudio.instance).toBe(audio);
  expect(document.body.append).not.toHaveBeenCalled();
});
