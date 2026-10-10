import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import worker from '../worker/src/index';
const env = {CORS_ORIGIN:'https://anamnesis.fm'};
const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://api.example${path}`,init),env);
beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

it('searches the first page and includes curated individual recordings', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({response:{docs:[{identifier:'one',creator:['A','B']}],numFound:1}}));
  const result = await request('/api/search?location=Africa&era=1970-1979');
  expect(result.status).toBe(200);
  const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
  expect(url.searchParams.get('page')).toBe('1');
  expect(url.searchParams.has('start')).toBe(false);
  expect(url.searchParams.get('q')).toContain('identifier:(');
  expect(url.searchParams.get('q')).toContain('"sraa-voice-of-kenya-circa-1975"');
  expect(url.searchParams.get('q')).toContain('year:[1970 TO 1979]');
  expect(url.searchParams.get('q')).not.toContain('coverage:');
  expect((await result.json()).items[0].creator).toBe('A, B');
});

it('never widens an empty region/genre intersection to worldwide results', async () => {
  const result = await request('/api/search?location=Asia&genre=hiphop');
  expect((await result.json()).items).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

it('returns an error with CORS when an awaited upstream request rejects', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('upstream unavailable'));
  const result = await request('/api/search');
  expect(result.status).toBe(500);
  expect(result.headers.get('Access-Control-Allow-Origin')).toBe(env.CORS_ORIGIN);
});

it('normalizes array metadata and prefers the recording year', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({metadata:{title:['Show'],creator:['A','B'],year:'1942',date:'2026-01-01'},files:[{name:'a.mp3'},{name:'video.mp4'}]}));
  const data = await (await request('/api/metadata/one')).json();
  expect(data).toMatchObject({title:'Show',creator:'A, B',date:'1942',audioFiles:[{name:'a.mp3'}]});
});

it('preserves byte-range status and headers for seeking', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(16), {status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes 0-15/100','Content-Length':'16'}}));
  const result = await request('/api/stream/item/audio.mp3',{headers:{Range:'bytes=0-15'}});
  expect(result.status).toBe(206);
  expect(result.headers.get('Content-Range')).toBe('bytes 0-15/100');
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({Range:'bytes=0-15'});
});

it('preserves unsatisfiable range responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null,{status:416,headers:{'Content-Range':'bytes */100'}}));
  const result = await request('/api/stream/item/audio.mp3',{headers:{Range:'bytes=200-300'}});
  expect(result.status).toBe(416);
  expect(result.headers.get('Content-Range')).toBe('bytes */100');
});

it('supports www origin without reflecting arbitrary sites', async () => {
  const www = await request('/missing',{headers:{Origin:'https://www.anamnesis.fm'}});
  const other = await request('/missing',{headers:{Origin:'https://unrelated.example'}});
  expect(www.headers.get('Access-Control-Allow-Origin')).toBe('https://www.anamnesis.fm');
  expect(www.headers.get('Vary')).toBe('Origin');
  expect(other.headers.get('Access-Control-Allow-Origin')).toBe(env.CORS_ORIGIN);
});

it('uses the stable Penguin Radio playlist ID rather than a renamed profile', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({tracks:[{id:123,title:'Penguin',duration:2000}]}));
  const result = await request('/api/penguin-radio');
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/playlists/2180699213?');
  expect((await result.json()).items[0]).toMatchObject({soundcloudId:123,title:'Penguin',duration:2});
});

it('does not pretend an HLS playlist is a progressive audio file', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({media:{transcodings:[{url:'https://stream.example/hls',format:{protocol:'hls',mime_type:'audio/mpegurl'}}]}}));
  const result = await request('/api/soundcloud-stream/123');
  expect(result.status).toBe(500);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('rejects malformed track identifiers before any upstream call', async () => {
  const result = await request('/api/soundcloud-stream/123%3Fx=1');
  expect(result.status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

it('bounds worldwide queries to stay within Archive query limits', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({response:{docs:[],numFound:0}}));
  expect((await request('/api/search')).status).toBe(200);
  expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1);
  for (const [url] of vi.mocked(fetch).mock.calls) {
    expect(new URL(String(url)).searchParams.get('q')!.length).toBeLessThan(3500);
  }
});

it('lets a small station repeat after every item has been played', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({response:{docs:[{identifier:'only',title:'Only show'}],numFound:1}}));
  expect((await (await request('/api/search?location=Australia&exclude=only')).json()).items).toHaveLength(1);
});

it('searches actual recording years rather than guessing which decades a station covers', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({response:{docs:[{identifier:'australia1994',year:1994}],numFound:1}}));
  const result = await request('/api/search?location=Australia&era=1990-1999');
  expect((await result.json()).items[0].date).toBe('1994');
  const query = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams.get('q');
  expect(query).toContain('stalking-the-nightmare-radio');
  expect(query).toContain('year:[1990 TO 1999]');
});
