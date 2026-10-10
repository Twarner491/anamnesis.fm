// Cloudflare Worker for anamnesis.fm API proxy
// Handles Archive.org API requests to avoid CORS issues

interface Env {
  CORS_ORIGIN: string;
  LISTENERS?: KVNamespace; // Optional KV namespace for listener tracking
}

// All verified radio collections from Internet Archive
// Updated: January 30, 2026 - Verified collections with new genre system
const ALL_RADIO_COLLECTIONS = [
  // === CLASSIC RADIO (1930s-1960s) ===
  'oldtimeradio',                     // ALL - 1930s-1960s
  'suspenseradio',                    // TALK - 1940s-1950s (1942-1962)
  'fibbermcgee',                      // TALK - 1930s-1950s (1935-1959)
  'abbottandcostelloradio',           // TALK - 1940s-1950s (1942-1949)
  'armedforcesradioservice',          // ALL - 1940s-2020s
  'bobandraytoaster',                 // TALK - 1950s-1970s (1951-1976)
  'joy-boys',                         // TALK - 1950s-1960s
  'OTRR_Certified_Lux_Radio_Theatre', // TALK - 1930s-1950s (1934-1955)
  'OrsonWelles_MercuryTheatre',       // TALK - 1930s-1940s (1938-1940)
  'OrsonWelles_CampbellPlayhouse',    // TALK - 1930s-1940s (1938-1940)

  // === RADIO DRAMA & BOOKS ===
  'radiobooks',                       // TALK - 1940s-2020s

  // === HIP-HOP RADIO ===
  'hiphopradioarchive',               // HIPHOP - 1980s-1990s-2000s
  'uprisingradio',                    // HIPHOP - 1990s-2010s
  'eastvillageradio-the-bobbito-garcia-radio-show', // HIPHOP - 1990s-2000s
  'eastvillageradio-forty-deuce',     // HIPHOP - 2000s-2010s

  // === EAST VILLAGE RADIO (2003-2014) ===
  'eastvillageradio',                           // ALL - 2000s-2010s
  'eastvillageradio-minimal-wave',              // ELECTRONIC - 2000s-2010s
  'eastvillageradio-mystic-sound',              // ALL - 2000s-2010s
  'eastvillageradio-peer-pressure',             // ROCK - 2000s-2010s
  'eastvillageradio-the-holy-sh-t-sound-system', // ALL - 2000s-2010s
  'eastvillageradio-jamaica-rock',              // ROCK - 2000s-2010s
  'eastvillageradio-pop-goes-the-future',       // ALL - 2000s-2010s
  'eastvillageradio-the-ragged-phonograph-program', // FOLK - 2000s-2010s
  'eastvillageradio-radioingrid',               // ELECTRONIC - 2000s-2010s
  'eastvillageradio-black-and-blue-take-over',  // JAZZ - 2000s-2010s

  // === TALK RADIO (News, Sports, Commentary) ===
  'imus-in-the-morning',              // TALK - 1970s-2010s
  'Radio-BBC-Radio-5-Live',           // TALK - 1990s-2020s
  'pacifica_radio_archives_grammy_2013', // TALK - 1950s-2010s
  '2600-off-the-hook',                // TALK - 1980s-2020s
  'alanwattarchive',                  // TALK - 2000s-2010s
  'crapfromthepast',                  // TALK - Various
  'FM99_WNOR_Tommy_and_Rumble',       // TALK - 1980s-2000s

  // === UK PIRATE RADIO (Dance/Electronic/Rave + 1960s Offshore) ===
  'uk-rave-mixtapes-1988-1993-complete', // ELECTRONIC - 1980s-1990s
  'death-is-not-the-end-london-pirate-radio-adverts-1984-1993-vol.-1', // ELECTRONIC - 1980s-1990s
  'PirateYearsRadioShowWithPaulPeters', // TALK - 1950s-1990s (retrospective)
  'EdMorenosTributeToTomPepperChairmanRadioInvictaAutum1964', // ROCK - 1960s
  'ShortwavePirateRadio',             // ALL - 1980s-2020s
  'shortwave-pirate-radio-studio-recordings', // ALL - 1980s-2010s

  // === ROCK & ALTERNATIVE ===
  'radiofreecrockett',                // ROCK - 1970s-1980s

  // === EUROPEAN STATIONS ===
  'concertzender',                    // CLASSICAL - 2000s-2020s (Netherlands)
  'radiotrinitatvella',               // ALL - Spain
  'radiafm',                          // ROCK - Europe
  'radiovkarchive',                   // ALL - Russia
  'radiowombat',                      // ALL - 2020s (Italy)
  'johnsinclair-rfa',                 // ROCK - Netherlands

  // === LATIN AMERICAN STATIONS ===
  'osornoradio',                      // ALL - Chile
  'lamosquitera',                     // ALL - Latin America
  'radiocaracasradio',                // ALL - Venezuela
  'lavoladoraradioarchive',           // ALL - Latin America
  'psicotropicodelia',                // ELECTRONIC - South America

  // === AFRICAN STATIONS ===
  'cairopublicradio',                 // ALL - 2010s-2020s (Egypt)
  'sraa-voice-of-kenya-circa-1975',   // ALL - 1970s (Kenya)
  'modernghanaradiocenterrewind-2010-daasebreonhighliferadiolive', // ALL - 2010s (Ghana)
  '2ModernGhanaRadioCenteronlineAudioConverter.comHIGHLIFERADIOARCHIVESDAASEBRETIME', // ALL - 2010s (Ghana)
  'GHANAARCHIVES-EMERGINGCOMMUNITYRADIOKAKAGHANAMEDIA-NKWAFM', // ALL - 2010s-2020s (Ghana)
  'G.A.DABLEKUMAOPAMFORADIO',         // ALL - 2010s (Ghana)

  // === ASIAN STATIONS ===
  'ujyaaloradio',                     // ALL - Nepal
  'hams-radio-japan',                 // ALL - Japan
  'radio-pakistan-general-overseas-svc-han', // ALL - 1950s-2020s (Pakistan)
  'sraa-radio-thailand-june-13-2016', // ALL - 2010s (Thailand)

  // === MIDDLE EASTERN STATIONS ===
  'radioislaminternational',          // TALK - Islamic broadcasting
  'artsakhtv_audio',                  // ALL - Armenia
  'sraa-syrian-radio-amp-television-1970s-recording', // ALL - 1970s (Syria)

  // === AUSTRALIA ===
  'stalking-the-nightmare-radio',     // ALL - 2000s (Australia)

  // === FOLK RADIO ===
  'utmafolkshow',                     // FOLK - 2010s (Under the Mason's Apron)
  'outofthewoods',                    // FOLK - Folk/Americana

  // === ELECTRONIC & EXPERIMENTAL ===
  'vanzemlja-sounds',                 // ELECTRONIC - 2010s-2020s

  // === GENERAL ARCHIVES ===
  'radiostationarchives',             // ALL - Multi-decade
  'radioshowarchive',                 // ALL - Multi-show archive
  'radioprograms',                    // ALL - Multi-program archive

  // === INDIVIDUAL STATION ARCHIVES ===
  'wjms-radio',                       // ALL - USA
  'wjzmarchive',                      // ALL - USA
  'wyceradio',                        // ALL - 2000s-2020s (Michigan)

  // === ECLECTIC / SPECIALTY ===
  'radio-eclectica',                  // ALL - Multi-genre
  'the-fox-pirates-cove',             // ALL - Pirate radio
  'quality-radio-productions',        // ALL - Production archive
  'SchickeleMix',                     // JAZZ - Classical/jazz mix
] as const;

// Pre-grouped collections by CONTINENT
// Maps continent filter keywords to relevant collections
const COLLECTIONS_BY_CONTINENT: Record<string, string[]> = {
  'North America': [
    'oldtimeradio',
    'suspenseradio',
    'fibbermcgee',
    'abbottandcostelloradio',
    'armedforcesradioservice',
    'bobandraytoaster',
    'joy-boys',
    'OTRR_Certified_Lux_Radio_Theatre',
    'OrsonWelles_MercuryTheatre',
    'OrsonWelles_CampbellPlayhouse',
    'hiphopradioarchive',
    'uprisingradio',
    'eastvillageradio',
    'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio-minimal-wave',
    'eastvillageradio-mystic-sound',
    'eastvillageradio-peer-pressure',
    'eastvillageradio-the-holy-sh-t-sound-system',
    'eastvillageradio-forty-deuce',
    'eastvillageradio-jamaica-rock',
    'eastvillageradio-pop-goes-the-future',
    'eastvillageradio-the-ragged-phonograph-program',
    'eastvillageradio-radioingrid',
    'eastvillageradio-black-and-blue-take-over',
    'imus-in-the-morning',
    'pacifica_radio_archives_grammy_2013',
    '2600-off-the-hook',
    'crapfromthepast',
    'radiofreecrockett',
    'FM99_WNOR_Tommy_and_Rumble',
    'wjms-radio',
    'wjzmarchive',
    'wyceradio',
    'outofthewoods',
    'alanwattarchive',
  ],

  'South America': [
    'osornoradio',
    'lamosquitera',
    'radiocaracasradio',
    'lavoladoraradioarchive',
    'psicotropicodelia',
  ],

  'Europe': [
    // UK
    'Radio-BBC-Radio-5-Live',
    'uk-rave-mixtapes-1988-1993-complete',
    'death-is-not-the-end-london-pirate-radio-adverts-1984-1993-vol.-1',
    'PirateYearsRadioShowWithPaulPeters',
    'EdMorenosTributeToTomPepperChairmanRadioInvictaAutum1964',
    'radiobooks',
    'utmafolkshow',
    // Other Europe
    'concertzender',
    'radiotrinitatvella',
    'radiafm',
    'radiovkarchive',
    'radiowombat',
    'johnsinclair-rfa',
  ],

  'Asia': [
    'ujyaaloradio',
    'hams-radio-japan',
    'radio-pakistan-general-overseas-svc-han',
    'sraa-radio-thailand-june-13-2016',
  ],

  'Middle East': [
    'radioislaminternational',
    'artsakhtv_audio',
    'cairopublicradio',
    'sraa-syrian-radio-amp-television-1970s-recording',
  ],

  'Africa': [
    'cairopublicradio',
    'sraa-voice-of-kenya-circa-1975',
    'modernghanaradiocenterrewind-2010-daasebreonhighliferadiolive',
    '2ModernGhanaRadioCenteronlineAudioConverter.comHIGHLIFERADIOARCHIVESDAASEBRETIME',
    'GHANAARCHIVES-EMERGINGCOMMUNITYRADIOKAKAGHANAMEDIA-NKWAFM',
    'G.A.DABLEKUMAOPAMFORADIO',
  ],

  'Australia': [
    'stalking-the-nightmare-radio',
  ],

  'WORLD': [
    'radiostationarchives',
    'radioshowarchive',
    'radioprograms',
    'radio-eclectica',
    'the-fox-pirates-cove',
    'quality-radio-productions',
    'SchickeleMix',
    'vanzemlja-sounds',
    'armedforcesradioservice',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
  ],
};

// Pre-grouped collections by GENRE (New System)
// Genres: ALL, FOLK, JAZZ, HIPHOP, CLASSICAL, COUNTRY/BLUES, ELECTRONIC, TALK, ROCK
const COLLECTIONS_BY_GENRE: Record<string, string[]> = {
  // ALL - Multi-genre stations
  'all': [
    'oldtimeradio',
    'armedforcesradioservice',
    'eastvillageradio',
    'eastvillageradio-the-holy-sh-t-sound-system',
    'eastvillageradio-mystic-sound',
    'eastvillageradio-pop-goes-the-future',
    'wyceradio',
    'radiostationarchives',
    'radioshowarchive',
    'radioprograms',
    'radio-eclectica',
    'quality-radio-productions',
    'cairopublicradio',
    'sraa-voice-of-kenya-circa-1975',
    'radio-pakistan-general-overseas-svc-han',
    'radiotrinitatvella',
    'radiovkarchive',
    'osornoradio',
    'lamosquitera',
    'radiocaracasradio',
    'lavoladoraradioarchive',
    'ujyaaloradio',
    'hams-radio-japan',
    'artsakhtv_audio',
    'radiafm',
    'wjms-radio',
    'wjzmarchive',
    'the-fox-pirates-cove',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
    'radiowombat',
    'sraa-radio-thailand-june-13-2016',
    'sraa-syrian-radio-amp-television-1970s-recording',
    'stalking-the-nightmare-radio',
    // Ghana stations
    'modernghanaradiocenterrewind-2010-daasebreonhighliferadiolive',
    '2ModernGhanaRadioCenteronlineAudioConverter.comHIGHLIFERADIOARCHIVESDAASEBRETIME',
    'GHANAARCHIVES-EMERGINGCOMMUNITYRADIOKAKAGHANAMEDIA-NKWAFM',
    'G.A.DABLEKUMAOPAMFORADIO',
  ],

  // HIPHOP - Hip-hop radio
  'hiphop': [
    'hiphopradioarchive',
    'uprisingradio',
    'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio-forty-deuce',
  ],
  'hip-hop': [
    'hiphopradioarchive',
    'uprisingradio',
    'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio-forty-deuce',
  ],
  'rap': [
    'hiphopradioarchive',
    'uprisingradio',
    'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio-forty-deuce',
  ],

  // TALK - News, sports, comedy, talk shows, drama
  'talk': [
    'suspenseradio',
    'fibbermcgee',
    'abbottandcostelloradio',
    'bobandraytoaster',
    'joy-boys',
    'crapfromthepast',
    'Radio-BBC-Radio-5-Live',
    'imus-in-the-morning',
    'pacifica_radio_archives_grammy_2013',
    '2600-off-the-hook',
    'alanwattarchive',
    'radiobooks',
    'radioislaminternational',
    'PirateYearsRadioShowWithPaulPeters',
    'FM99_WNOR_Tommy_and_Rumble',
    'OTRR_Certified_Lux_Radio_Theatre',
    'OrsonWelles_MercuryTheatre',
    'OrsonWelles_CampbellPlayhouse',
  ],
  'news': [
    'Radio-BBC-Radio-5-Live',
    'pacifica_radio_archives_grammy_2013',
    '2600-off-the-hook',
  ],
  'comedy': [
    'fibbermcgee',
    'abbottandcostelloradio',
    'bobandraytoaster',
    'joy-boys',
    'crapfromthepast',
  ],

  // ROCK - Rock music radio
  'rock': [
    'radiofreecrockett',
    'eastvillageradio-peer-pressure',
    'eastvillageradio-jamaica-rock',
    'radiafm',
    'johnsinclair-rfa',
    'EdMorenosTributeToTomPepperChairmanRadioInvictaAutum1964',
  ],

  // JAZZ - Jazz music radio
  'jazz': [
    'SchickeleMix',
    'eastvillageradio-black-and-blue-take-over',
  ],

  // ELECTRONIC - Electronic, dance, techno, house, etc.
  'electronic': [
    'eastvillageradio-minimal-wave',
    'eastvillageradio-radioingrid',
    'psicotropicodelia',
    'vanzemlja-sounds',
    'uk-rave-mixtapes-1988-1993-complete',
    'death-is-not-the-end-london-pirate-radio-adverts-1984-1993-vol.-1',
  ],

  // FOLK - Folk music radio
  'folk': [
    'eastvillageradio-the-ragged-phonograph-program',
    'outofthewoods',
    'utmafolkshow',
  ],

  // CLASSICAL - Classical music radio
  'classical': [
    'concertzender',
    'SchickeleMix',
  ],

  // COUNTRY/BLUES - Country and blues music (combined genre)
  'country': [
    'radiofreecrockett',
    'outofthewoods',
  ],
  'blues': [
    'radiofreecrockett',
    'outofthewoods',
    'eastvillageradio-black-and-blue-take-over',
  ],
  'country/blues': [
    'radiofreecrockett',
    'outofthewoods',
    'eastvillageradio-black-and-blue-take-over',
  ],
};

// Get collections filtered by criteria
function getFilteredCollections(
  location: string | null,
  genre: string | null
): string[] {
  let collections = new Set<string>(ALL_RADIO_COLLECTIONS);

  // Filter by location/continent - intersect with current set
  if (location) {
    // Try to find matching continent key
    const continentKey = Object.keys(COLLECTIONS_BY_CONTINENT).find(
      key => location.toLowerCase().includes(key.toLowerCase()) ||
             key.toLowerCase().includes(location.toLowerCase())
    );
    if (continentKey) {
      const continentCollections = new Set(COLLECTIONS_BY_CONTINENT[continentKey]);
      collections = new Set([...collections].filter(c => continentCollections.has(c)));
    }
  }

  // Filter by genre - intersect with current set
  if (genre) {
    const genreLower = genre.toLowerCase();
    const genreKey = Object.hasOwn(COLLECTIONS_BY_GENRE, genreLower) ? genreLower : undefined;
    if (genreKey) {
      const genreCollections = new Set(COLLECTIONS_BY_GENRE[genreKey]);
      collections = new Set([...collections].filter(c => genreCollections.has(c)));
    }
  }


  return [...collections];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowed = new Set([env.CORS_ORIGIN || 'https://anamnesis.fm', 'https://www.anamnesis.fm']);
    const origin = request.headers.get('Origin');
    const corsOrigin = origin && allowed.has(origin) ? origin : (env.CORS_ORIGIN || 'https://anamnesis.fm');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Vary': 'Origin',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Vary': 'Origin',
    };

    try {
      // Route requests
      if (url.pathname === '/api/search') {
        return await handleSearch(url, corsHeaders);
      } else if (url.pathname === '/api/penguin-radio') {
        // Easter egg: Antarctica's Penguin Radio - SoundCloud playlist
        return await handlePenguinRadio(corsHeaders);
      } else if (url.pathname.startsWith('/api/soundcloud-stream/')) {
        // Stream audio from SoundCloud
        const trackUrl = decodeURIComponent(url.pathname.replace('/api/soundcloud-stream/', ''));
        return await handleSoundCloudStream(trackUrl, request, corsHeaders);
      } else if (url.pathname.startsWith('/api/metadata/')) {
        const id = decodeURIComponent(url.pathname.replace('/api/metadata/', ''));
        return await handleMetadata(id, corsHeaders);
      } else if (url.pathname.startsWith('/api/stream/')) {
        const path = url.pathname.replace('/api/stream/', '');
        return await handleStream(path, request, corsHeaders);
      } else if (url.pathname === '/api/heartbeat') {
        return await handleHeartbeat(env, corsHeaders, request);
      } else if (url.pathname === '/api/listeners') {
        return await handleListenerCount(env, corsHeaders);
      } else {
        return new Response('Not found', {
          status: 404,
          headers: corsHeaders,
        });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

function textValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string').join(', ') || undefined;
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
}

async function handleSearch(url: URL, corsHeaders: Record<string, string>): Promise<Response> {
  const era = url.searchParams.get('era');
  const location = url.searchParams.get('location');
  const genre = url.searchParams.get('genre');
  if (era && !/^\d{4}-\d{4}$/.test(era)) {
    return Response.json({error: 'Invalid era'}, {status: 400, headers: corsHeaders});
  }
  const collections = getFilteredCollections(location, genre);
  if (!collections.length) return Response.json({items: [], count: 0, total: 0}, {headers: corsHeaders});
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  // Archive limits query length. Keep every selected source, in bounded batches.
  const batches: string[][] = [];
  for (let i = 0; i < collections.length; i += 16) batches.push(collections.slice(i, i + 16));
  const results = await Promise.allSettled(batches.map(async batch => {
    const sources = batch.map(c => `"${c}"`).join(' OR ');
    let query = `(collection:(${sources}) OR identifier:(${sources})) AND mediatype:audio`;
    if (era) {
      const [start, end] = era.split('-');
      query += ` AND year:[${start} TO ${end}]`;
    }
    // The source maps specify region and genre; recordings rarely name continents.
    const params = new URLSearchParams({q: query, rows: '100', page: String(page), output: 'json'});
    for (const field of ['identifier', 'title', 'date', 'year', 'creator']) params.append('fl[]', field);
    params.set('sort[]', 'downloads desc');
    const response = await fetch(`https://archive.org/advancedsearch.php?${params}`, {
      headers: {'User-Agent': 'anamnesis.fm/1.0'},
      signal: AbortSignal.timeout(12000),
      cf: {cacheTtl: 300, cacheEverything: true},
    });
    if (!response.ok) throw new Error(`Archive search returned ${response.status}`);
    const data = await response.json() as {error?: string; response?: {docs?: Record<string, unknown>[]; numFound?: number}};
    if (data.error || !data.response) throw new Error('Invalid Archive search response');
    return data.response;
  }));
  const successful = results.filter(result => result.status === 'fulfilled');
  if (!successful.length) throw new Error('Archive search unavailable');
  const unique = new Map<string, {identifier: string; title: string; creator?: string; date?: string}>();
  for (const result of successful) {
    for (const item of result.value.docs || []) {
      if (typeof item.identifier !== 'string') continue;
      unique.set(item.identifier, {
        identifier: item.identifier, title: textValue(item.title) || item.identifier,
        creator: textValue(item.creator), date: textValue(item.year) || textValue(item.date),
      });
    }
  }
  const excluded = new Set((url.searchParams.get('exclude') || '').split(','));
  const unseen = [...unique.values()].filter(item => !excluded.has(item.identifier));
  // Small stations can loop once all their recordings have been heard.
  const items = shuffleArray(unseen.length ? unseen : [...unique.values()]);
  return Response.json({items, count: items.length, total: Math.max(...successful.map(result => result.value.numFound || 0)), page}, {
    headers: {...corsHeaders, 'Cache-Control': 'public, max-age=60'},
  });
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function handleMetadata(
  id: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing identifier' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const archiveUrl = `https://archive.org/metadata/${encodeURIComponent(id)}`;

    const response = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'anamnesis.fm/1.0' },
      signal: AbortSignal.timeout(12000),
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!response.ok) {
      throw new Error(`Archive.org API error: ${response.status}`);
    }

  const data = await response.json() as {
    metadata?: {
      identifier?: string;
      title?: string;
      creator?: string;
      date?: string;
      year?: string | number;
      description?: string;
      coverage?: string;
      subject?: string | string[];
    };
    files?: Array<{
      name: string;
      format?: string;
      size?: string;
      length?: string;
      title?: string;
    }>;
  };

  const audioFiles = (data.files || [])
    .filter((f) => {
      const name = f.name?.toLowerCase() || '';
      const format = f.format?.toLowerCase() || '';
      const isAudio = (
        name.endsWith('.mp3') ||
        (name.endsWith('.ogg') && !name.endsWith('.ogv')) ||
        format.includes('mp3') ||
        format.includes('vbr mp3') ||
        (format.includes('ogg') && !format.includes('video'))
      );
      const isVideo = (
        name.endsWith('.ogv') ||
        name.endsWith('.mp4') ||
        name.endsWith('.avi') ||
        name.endsWith('.mkv') ||
        name.endsWith('.webm') ||
        format.includes('video')
      );
      return isAudio && !isVideo;
    })
    .map((f) => ({
      name: f.name,
      title: f.title || f.name,
      duration: f.length,
      size: f.size,
    }));

  const year = data.metadata?.year;
  const date = textValue(data.metadata?.date);
  let effectiveDate = date;
  if (year) {
    const yearNum = typeof year === 'number' ? year : parseInt(String(year), 10);
    if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2030) {
      effectiveDate = String(yearNum);
    }
  }

    return new Response(
      JSON.stringify({
        identifier: id,
        title: textValue(data.metadata?.title) || id,
        creator: textValue(data.metadata?.creator),
        date: effectiveDate,
        description: data.metadata?.description,
        coverage: data.metadata?.coverage,
        subject: data.metadata?.subject,
        audioFiles,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('Metadata error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch metadata', audioFiles: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStream(
  path: string,
  request: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!path || !/^[a-zA-Z0-9_.-]+\//.test(path) || path.split('/').some(part => decodeURIComponent(part) === '..')) {
    return new Response('Missing path', {
      status: 400,
      headers: corsHeaders,
    });
  }

  const archiveUrl = `https://archive.org/download/${path}`;

  const headers: HeadersInit = {
    'User-Agent': 'anamnesis.fm/1.0',
  };

  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }

  const response = await fetch(archiveUrl, { headers, method: request.method === 'HEAD' ? 'HEAD' : 'GET', signal: AbortSignal.timeout(15000) });

  if (!response.ok) return new Response(null, {status: response.status, headers: {...corsHeaders, ...(response.headers.has('Content-Range') ? {'Content-Range': response.headers.get('Content-Range')!} : {})}});

  const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
  const contentLength = response.headers.get('Content-Length');
  const contentRange = response.headers.get('Content-Range');
  const acceptRanges = response.headers.get('Accept-Ranges');

  const responseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400',
    'Accept-Ranges': acceptRanges || 'bytes',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  if (contentLength) {
    responseHeaders['Content-Length'] = contentLength;
  }
  if (contentRange) {
    responseHeaders['Content-Range'] = contentRange;
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

// Listener tracking - heartbeat endpoint
// Clients call this every 90 seconds while playing
// NOTE: Does NOT return count to reduce KV list() operations
async function handleHeartbeat(
  env: Env,
  corsHeaders: Record<string, string>,
  request: Request
): Promise<Response> {
  if (!env.LISTENERS) {
    // KV not configured - return gracefully
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Use client IP as unique identifier (Cloudflare provides this header)
    const clientIp = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0] ||
                     'unknown';
    const clientId = `listener_${clientIp}`;

    // Store heartbeat with 3 minute TTL (clients should ping every 90s)
    // This reduces KV writes while still tracking active listeners
    await env.LISTENERS.put(clientId, '1', { expirationTtl: 180 });

    // Just acknowledge - don't count (saves list() operations)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Heartbeat error:', e);
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Cache key for listener count (to reduce list() operations)
const LISTENER_COUNT_CACHE_KEY = '_listener_count_cache';
const LISTENER_COUNT_CACHE_TTL = 300; // 5 minutes - max ~288 list() ops/day

// Get current listener count (cached to reduce KV list() operations)
async function handleListenerCount(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!env.LISTENERS) {
    return new Response(JSON.stringify({ count: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Try to get cached count first
    const cached = await env.LISTENERS.get(LISTENER_COUNT_CACHE_KEY);
    if (cached) {
      const { count, updatedAt } = JSON.parse(cached);
      const age = Date.now() - updatedAt;

      // If cache is fresh (less than 5 minutes old), use it
      if (age < LISTENER_COUNT_CACHE_TTL * 1000) {
        return new Response(JSON.stringify({ count, cached: true }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.floor((LISTENER_COUNT_CACHE_TTL * 1000 - age) / 1000)}`,
          },
        });
      }
    }

    // Cache is stale or missing - do the expensive list() operation
    const list = await env.LISTENERS.list();
    // Filter out cache key from count
    const count = list.keys.filter(k => !k.name.startsWith('_')).length;

    // Store in cache (no TTL - we manage freshness via updatedAt)
    await env.LISTENERS.put(
      LISTENER_COUNT_CACHE_KEY,
      JSON.stringify({ count, updatedAt: Date.now() })
    );

    return new Response(JSON.stringify({ count, cached: false }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${LISTENER_COUNT_CACHE_TTL}`,
      },
    });
  } catch (e) {
    console.error('Listener count error:', e);
    return new Response(JSON.stringify({ count: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// EASTER EGG: Penguin Radio (Antarctica)
// SoundCloud playlist for the Antarctica location
// ============================================

// Use the playlist's stable ID: profile renames invalidate permalink resolution.
const PENGUIN_RADIO_PLAYLIST_ID = 2180699213;

// SoundCloud client_id - extracted from their public pages
// This may need to be updated if SoundCloud changes their public client_id
const SOUNDCLOUD_CLIENT_ID = 'nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic';

interface SoundCloudTrack {
  id: number;
  title: string;
  user: { username: string };
  duration: number;
  stream_url?: string;
  media?: {
    transcodings: Array<{
      url: string;
      format: { protocol: string; mime_type: string };
    }>;
  };
}

interface SoundCloudPlaylist {
  tracks: SoundCloudTrack[];
  title: string;
}

// Fetch full track details from SoundCloud (for stub tracks missing titles)
async function fetchFullTrackDetails(trackId: number): Promise<SoundCloudTrack | null> {
  try {
    const trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const response = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      cf: {cacheTtl: 300, cacheEverything: true},
    });
    if (!response.ok) return null;
    return await response.json() as SoundCloudTrack;
  } catch {
    return null;
  }
}

// Fetch tracks from the Penguin Radio SoundCloud playlist
async function handlePenguinRadio(
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Use SoundCloud's API v2 to resolve the playlist
    const resolveUrl = `https://api-v2.soundcloud.com/playlists/${PENGUIN_RADIO_PLAYLIST_ID}?client_id=${SOUNDCLOUD_CLIENT_ID}`;

    const response = await fetch(resolveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      cf: {cacheTtl: 300, cacheEverything: true},
    });

    if (!response.ok) {
      console.error('SoundCloud API error:', response.status, await response.text());
      throw new Error(`SoundCloud API error: ${response.status}`);
    }

    const playlist = await response.json() as SoundCloudPlaylist;

    // Transform tracks to our format
    // SoundCloud sometimes returns "stub" objects with only ID - fetch full details for those
    const trackPromises = playlist.tracks
      .filter((track: SoundCloudTrack) => track.id)
      .map(async (track: SoundCloudTrack, index: number) => {
        // If track is missing title, fetch full details
        let fullTrack = track;
        if (!track.title) {
          const fetched = await fetchFullTrackDetails(track.id);
          if (fetched) fullTrack = fetched;
        }

        return {
          identifier: `soundcloud-${fullTrack.id}`,
          title: fullTrack.title || `Penguin Track ${index + 1}`,
          creator: 'Penguins of Antarctica',
          duration: Math.floor((fullTrack.duration || 0) / 1000), // Convert ms to seconds
          // Store the track ID for streaming
          soundcloudId: fullTrack.id,
          isPenguinRadio: true,
        };
      });

    const tracks = await Promise.all(trackPromises);

    // Shuffle the tracks for variety
    const shuffledTracks = shuffleArray(tracks);

    return new Response(
      JSON.stringify({
        items: shuffledTracks,
        count: shuffledTracks.length,
        source: 'penguin-radio',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (e) {
    console.error('Penguin Radio error:', e);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Penguin Radio tracks', items: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Stream audio from SoundCloud
async function handleSoundCloudStream(
  trackId: string,
  request: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!/^\d+$/.test(trackId)) return new Response('Invalid track ID', {status: 400, headers: corsHeaders});
  try {
    // Get stream URL from SoundCloud API v2
    const trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${SOUNDCLOUD_CLIENT_ID}`;

    const trackResponse = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      cf: {cacheTtl: 300, cacheEverything: true},
    });

    if (!trackResponse.ok) {
      throw new Error(`Failed to get track info: ${trackResponse.status}`);
    }

    const track = await trackResponse.json() as SoundCloudTrack;

    // Find the best transcoding (prefer progressive mp3)
    const transcodings = track.media?.transcodings || [];
    const progressive = transcodings.find(t => t.format.protocol === 'progressive');
    const transcoding = progressive;
    if (!transcoding) {
      throw new Error('No browser-compatible MP3 stream available for this track');
    }

    // Get the actual stream URL
    const streamUrlResponse = await fetch(`${transcoding.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!streamUrlResponse.ok) {
      throw new Error(`Failed to get stream URL: ${streamUrlResponse.status}`);
    }

    const streamData = await streamUrlResponse.json() as { url: string };
    const streamUrl = streamData.url;

    // Proxy the stream
    const rangeHeader = request.headers.get('Range');
    const streamResponse = await fetch(streamUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      signal: AbortSignal.timeout(15000),
    });

    if (!streamResponse.ok && streamResponse.status !== 206) {
      throw new Error(`Stream error: ${streamResponse.status}`);
    }

    const contentType = streamResponse.headers.get('Content-Type') || 'audio/mpeg';
    const contentLength = streamResponse.headers.get('Content-Length');
    const contentRange = streamResponse.headers.get('Content-Range');

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    return new Response(streamResponse.body, {
      status: streamResponse.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error('SoundCloud stream error:', e);
    return new Response(
      JSON.stringify({ error: 'Failed to stream audio' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
