// Cloudflare Worker for anamnesis.fm API proxy
// Handles Archive.org API requests to avoid CORS issues

interface Env {
  CORS_ORIGIN: string;
  LISTENERS?: KVNamespace; // Optional KV namespace for listener tracking
}

// All collections - comprehensive radio archives from Internet Archive
const ALL_COLLECTIONS = [
  // === CLASSIC RADIO / OLD TIME RADIO ===
  'oldtimeradio',
  'suspenseradio',
  'fibbermcgee',
  'abbottandcostelloradio',
  'armedforcesradioservice',
  'joy-boys',
  'bobandraytoaster',

  // === HIP-HOP & RAP ===
  'hiphopradioarchive',
  'uprisingradio',
  'eastvillageradio-the-bobbito-garcia-radio-show',
  'eastvillageradio-forty-deuce',

  // === ROCK & ALTERNATIVE ===
  'kornradio',
  'moodybluesradio',
  'radiofreecrockett',
  'eastvillageradio-peer-pressure',
  'fav-psychobilly_brasil',

  // === ELECTRONIC & EXPERIMENTAL ===
  'eastvillageradio-minimal-wave',
  'eastvillageradio-radioingrid',
  'finnish-electronic-mixtapes',
  'psicotropicodelia',
  'vanzemlja-sounds',

  // === JAZZ & BLUES ===
  'SchickeleMix',
  'eastvillageradio-black-and-blue-take-over',

  // === WORLD & REGGAE ===
  'eastvillageradio-mystic-sound',
  'eastvillageradio-jamaica-rock',
  'radiotiana',
  'ujyaaloradio',

  // === EAST VILLAGE RADIO SHOWS ===
  'eastvillageradio',
  'eastvillageradio-the-holy-sh-t-sound-system',
  'eastvillageradio-pop-goes-the-future',
  'eastvillageradio-the-ragged-phonograph-program',

  // === TALK RADIO & NEWS ===
  'imus-in-the-morning',
  'Radio-BBC-Radio-5-Live',
  'pacifica_radio_archives_grammy_2013',
  'alanwattarchive',
  '2600-off-the-hook',

  // === COMEDY ===
  'crapfromthepast',

  // === INTERNATIONAL - EUROPE ===
  'concertzender',
  'radiotrinitatvella',
  'radiafm',
  'radiovkarchive',
  'radiowombat',
  'johnsinclair-rfa',
  'fav-busca_en_la_basura_',
  'mart-giovanni-fontana',

  // === INTERNATIONAL - LATIN AMERICA ===
  'osornoradio',
  'lamosquitera',
  'radiocaracasradio',
  'lavoladoraradioarchive',

  // === INTERNATIONAL - ASIA & MIDDLE EAST ===
  'radioislaminternational',
  'hams-radio-japan',
  'japan-jukebox',
  'artsakhtv_audio',
  'cairopublicradio',

  // === ECLECTIC / MIXED ===
  'radio-eclectica',
  'the-fox-pirates-cove',
  'outofthewoods',
  'musicforthemountain',
  'quality-radio-productions',
  'qualityradioproductions',
  'stalking-the-nightmare-radio',
  'emptymindsradio',
  'ohbejoyful',
  'HogMaw',
  'ytjdradio',

  // === STATION ARCHIVES ===
  'radiostationarchives',
  'radioshowarchive',
  'radioprograms',
  'FM99_WNOR_Tommy_and_Rumble',
  'wjms-radio',
  'wjzmarchive',
  'oidradioarchive',
] as const;

// Pre-grouped collections by LOCATION (continent-based)
// Maps continent filter keywords to relevant collections
const COLLECTIONS_BY_LOCATION: Record<string, string[]> = {
  // North America (USA, Canada)
  'North America': [
    'oldtimeradio', 'suspenseradio', 'fibbermcgee', 'abbottandcostelloradio',
    'armedforcesradioservice', 'joy-boys', 'bobandraytoaster',
    'hiphopradioarchive', 'uprisingradio', 'eastvillageradio-the-bobbito-garcia-radio-show',
    'kornradio', 'radiofreecrockett', 'SchickeleMix',
    'eastvillageradio', 'eastvillageradio-mystic-sound', 'eastvillageradio-minimal-wave',
    'eastvillageradio-peer-pressure', 'eastvillageradio-the-holy-sh-t-sound-system',
    'eastvillageradio-forty-deuce', 'eastvillageradio-jamaica-rock',
    'eastvillageradio-pop-goes-the-future', 'eastvillageradio-the-ragged-phonograph-program',
    'eastvillageradio-radioingrid', 'eastvillageradio-black-and-blue-take-over',
    'imus-in-the-morning', 'pacifica_radio_archives_grammy_2013', 'alanwattarchive',
    '2600-off-the-hook', 'crapfromthepast', 'the-fox-pirates-cove', 'outofthewoods',
    'musicforthemountain', 'quality-radio-productions', 'qualityradioproductions',
    'FM99_WNOR_Tommy_and_Rumble', 'wjms-radio', 'wjzmarchive', 'HogMaw', 'ytjdradio',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // South America (Chile, Brazil, Argentina, Venezuela, etc.)
  'South America': [
    'osornoradio', 'lamosquitera', 'radiocaracasradio', 'lavoladoraradioarchive',
    'fav-psychobilly_brasil', 'psicotropicodelia', 'radiotiana',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // Europe (UK, Netherlands, Spain, Germany, France, Russia, Italy, Finland, etc.)
  'Europe': [
    'Radio-BBC-Radio-5-Live', 'moodybluesradio', 'concertzender', 'radiotrinitatvella',
    'radiafm', 'radiovkarchive', 'radiowombat', 'johnsinclair-rfa',
    'fav-busca_en_la_basura_', 'mart-giovanni-fontana', 'finnish-electronic-mixtapes',
    'vanzemlja-sounds', 'radiotiana',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // Asia (Nepal, Japan, etc.)
  'Asia': [
    'ujyaaloradio', 'hams-radio-japan', 'japan-jukebox', 'radiotiana',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // Middle East (includes Islamic broadcasting, Armenia, Egypt)
  'Middle East': [
    'radioislaminternational', 'artsakhtv_audio', 'cairopublicradio', 'radiotiana',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // Africa
  'Africa': [
    'radiotiana', 'radioislaminternational', 'cairopublicradio',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
};

// Pre-grouped collections by GENRE
const COLLECTIONS_BY_GENRE: Record<string, string[]> = {
  // Jazz
  'jazz': [
    'SchickeleMix', 'oldtimeradio', 'radiofreecrockett', 'eastvillageradio',
    'concertzender', 'pacifica_radio_archives_grammy_2013',
  ],
  // Blues
  'blues': [
    'eastvillageradio-black-and-blue-take-over', 'radiofreecrockett', 'oldtimeradio',
    'SchickeleMix', 'pacifica_radio_archives_grammy_2013',
  ],
  // Rock
  'rock': [
    'kornradio', 'moodybluesradio', 'radiofreecrockett', 'eastvillageradio-peer-pressure',
    'fav-psychobilly_brasil', 'FM99_WNOR_Tommy_and_Rumble', 'HogMaw',
  ],
  // Hip-hop / Rap
  'hip-hop': [
    'hiphopradioarchive', 'uprisingradio', 'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio', 'eastvillageradio-forty-deuce',
  ],
  'rap': [
    'hiphopradioarchive', 'uprisingradio', 'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio', 'eastvillageradio-forty-deuce',
  ],
  'hip hop': [
    'hiphopradioarchive', 'uprisingradio', 'eastvillageradio-the-bobbito-garcia-radio-show',
    'eastvillageradio', 'eastvillageradio-forty-deuce',
  ],
  // Soul / Funk / R&B
  'soul': [
    'eastvillageradio-black-and-blue-take-over', 'hiphopradioarchive', 'uprisingradio',
    'pacifica_radio_archives_grammy_2013',
  ],
  'r&b': [
    'eastvillageradio-black-and-blue-take-over', 'hiphopradioarchive', 'uprisingradio',
  ],
  // Classical
  'classical': [
    'SchickeleMix', 'concertzender', 'radiafm', 'pacifica_radio_archives_grammy_2013',
  ],
  // Country / Folk
  'country': [
    'radiofreecrockett', 'oldtimeradio', 'outofthewoods', 'musicforthemountain',
    'wjzmarchive',
  ],
  'folk': [
    'radiofreecrockett', 'outofthewoods', 'musicforthemountain', 'pacifica_radio_archives_grammy_2013',
  ],
  // Electronic / Synth
  'electronic': [
    'eastvillageradio-minimal-wave', 'eastvillageradio-radioingrid', 'radiafm',
    'finnish-electronic-mixtapes', 'psicotropicodelia', 'vanzemlja-sounds',
  ],
  'synth': [
    'eastvillageradio-minimal-wave', 'eastvillageradio-radioingrid', 'finnish-electronic-mixtapes',
  ],
  // News
  'news': [
    'Radio-BBC-Radio-5-Live', 'pacifica_radio_archives_grammy_2013', 'armedforcesradioservice',
    'radiostationarchives', 'radioshowarchive',
  ],
  // Comedy
  'comedy': [
    'oldtimeradio', 'fibbermcgee', 'abbottandcostelloradio', 'joy-boys', 'bobandraytoaster',
    'crapfromthepast', 'SchickeleMix',
  ],
  // Sports
  'sports': [
    'Radio-BBC-Radio-5-Live', 'radiostationarchives', 'radioshowarchive',
  ],
};

// Pre-grouped collections by ERA
// Note: These are approximate - the era of the broadcast, not necessarily the music
const COLLECTIONS_BY_ERA: Record<string, string[]> = {
  // Golden Age Radio (1920s-1960s)
  '1920-1929': ['oldtimeradio'],
  '1930-1939': ['oldtimeradio', 'suspenseradio'],
  '1940-1949': ['oldtimeradio', 'suspenseradio', 'fibbermcgee', 'abbottandcostelloradio', 'armedforcesradioservice'],
  '1950-1959': ['oldtimeradio', 'suspenseradio', 'fibbermcgee', 'radiofreecrockett', 'joy-boys'],
  '1960-1969': ['oldtimeradio', 'radiofreecrockett', 'moodybluesradio', 'joy-boys', 'bobandraytoaster'],
  // 70s-80s
  '1970-1979': ['radiofreecrockett', 'moodybluesradio', 'radiostationarchives', 'pacifica_radio_archives_grammy_2013'],
  '1980-1989': ['radiofreecrockett', 'hiphopradioarchive', 'kornradio', 'radiostationarchives', 'FM99_WNOR_Tommy_and_Rumble'],
  // 90s - Hip-hop golden era
  '1990-1999': [
    'hiphopradioarchive', 'uprisingradio', 'eastvillageradio-the-bobbito-garcia-radio-show',
    'radiofreecrockett', 'kornradio', 'imus-in-the-morning',
    'radiostationarchives', 'radioshowarchive', 'radioprograms',
  ],
  // 2000s+ - Modern radio / EVR era
  '2000-2009': [
    'eastvillageradio', 'eastvillageradio-mystic-sound', 'eastvillageradio-minimal-wave',
    'eastvillageradio-peer-pressure', 'eastvillageradio-the-holy-sh-t-sound-system',
    'eastvillageradio-forty-deuce', 'eastvillageradio-jamaica-rock',
    'eastvillageradio-pop-goes-the-future', 'eastvillageradio-the-ragged-phonograph-program',
    'eastvillageradio-radioingrid', 'eastvillageradio-black-and-blue-take-over',
    'hiphopradioarchive', 'uprisingradio', 'Radio-BBC-Radio-5-Live',
    'radiostationarchives', 'radioshowarchive', 'radioprograms', 'SchickeleMix', 'radiotiana', 'radiafm',
  ],
  '2010-2019': [
    'eastvillageradio', 'eastvillageradio-mystic-sound', 'eastvillageradio-minimal-wave',
    'eastvillageradio-peer-pressure', 'eastvillageradio-the-holy-sh-t-sound-system',
    'eastvillageradio-forty-deuce', 'eastvillageradio-jamaica-rock',
    'eastvillageradio-pop-goes-the-future', 'eastvillageradio-the-ragged-phonograph-program',
    'eastvillageradio-radioingrid', 'eastvillageradio-black-and-blue-take-over',
    'Radio-BBC-Radio-5-Live', 'finnish-electronic-mixtapes', 'psicotropicodelia',
    'radiostationarchives', 'radioshowarchive', 'radioprograms', 'radiotiana', 'radiafm',
    'lamosquitera', 'osornoradio', 'ujyaaloradio', 'concertzender', 'radiotrinitatvella',
  ],
  '2020-2029': [
    'Radio-BBC-Radio-5-Live', 'radiostationarchives', 'radioshowarchive', 'radioprograms',
    'radiotiana', 'radiafm', 'lamosquitera', 'osornoradio', 'ujyaaloradio',
    'wjms-radio', 'wjzmarchive', 'concertzender', 'oidradioarchive',
    'radiotrinitatvella', 'radiovkarchive', 'cairopublicradio',
  ],
};

// Get collections filtered by criteria
function getFilteredCollections(
  era: string | null,
  location: string | null,
  genre: string | null
): string[] {
  let collections = new Set<string>(ALL_COLLECTIONS);

  // Filter by era if specified
  if (era && COLLECTIONS_BY_ERA[era]) {
    collections = new Set(COLLECTIONS_BY_ERA[era]);
  }

  // Filter by location - intersect with current set
  if (location) {
    // Try to find matching location key
    const locationKey = Object.keys(COLLECTIONS_BY_LOCATION).find(
      key => location.toLowerCase().includes(key.toLowerCase()) ||
             key.toLowerCase().includes(location.toLowerCase())
    );
    if (locationKey) {
      const locationCollections = new Set(COLLECTIONS_BY_LOCATION[locationKey]);
      collections = new Set([...collections].filter(c => locationCollections.has(c)));
    }
  }

  // Filter by genre - intersect with current set
  if (genre) {
    const genreLower = genre.toLowerCase();
    const genreKey = Object.keys(COLLECTIONS_BY_GENRE).find(
      key => genreLower.includes(key) || key.includes(genreLower)
    );
    if (genreKey) {
      const genreCollections = new Set(COLLECTIONS_BY_GENRE[genreKey]);
      collections = new Set([...collections].filter(c => genreCollections.has(c)));
    }
  }

  // If filtering resulted in empty set, fall back to all collections
  if (collections.size === 0) {
    return [...ALL_COLLECTIONS];
  }

  return [...collections];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsOrigin = env.CORS_ORIGIN || '*';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    try {
      // Route requests
      if (url.pathname === '/api/search') {
        return handleSearch(url, corsHeaders);
      } else if (url.pathname.startsWith('/api/metadata/')) {
        const id = url.pathname.replace('/api/metadata/', '');
        return handleMetadata(id, corsHeaders);
      } else if (url.pathname.startsWith('/api/stream/')) {
        const path = url.pathname.replace('/api/stream/', '');
        return handleStream(path, request, corsHeaders);
      } else if (url.pathname === '/api/heartbeat') {
        return handleHeartbeat(env, corsHeaders, request);
      } else if (url.pathname === '/api/listeners') {
        return handleListenerCount(env, corsHeaders);
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

async function handleSearch(
  url: URL,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const era = url.searchParams.get('era');
  const location = url.searchParams.get('location');
  const genre = url.searchParams.get('genre');
  const page = url.searchParams.get('page') || '1';

  // Get pre-filtered collections based on filters
  const collections = getFilteredCollections(era, location, genre);

  // Shuffle which collections we query - pick a random subset if we have many
  let queryCollections = collections;
  if (collections.length > 10) {
    // Shuffle and take a random subset (5-15 collections) for variety
    const shuffledCollections = shuffleArray([...collections]);
    const subsetSize = 5 + Math.floor(Math.random() * 10);
    queryCollections = shuffledCollections.slice(0, Math.min(subsetSize, collections.length));
  }

  console.log(`Searching ${queryCollections.length} of ${collections.length} collections (filtered from ${ALL_COLLECTIONS.length})`);

  // Build Archive.org query with filtered/randomized collections
  const collectionQuery = queryCollections.map((c) => `collection:${c}`).join(' OR ');
  let query = `(${collectionQuery})`;

  // PRIORITY 1: Era/Year filter is STRICT - always applied exactly
  if (era) {
    const [start, end] = era.split('-');
    if (start && end) {
      query += ` AND year:[${start} TO ${end}]`;
    }
  }

  // PRIORITY 2: Location filter (still apply for precision within pre-filtered collections)
  if (location) {
    query += ` AND (coverage:(${location}) OR title:(${location}) OR description:(${location}) OR creator:(${location}))`;
  }

  // PRIORITY 3: Genre filter
  if (genre) {
    query += ` AND (subject:(${genre}) OR title:(${genre}) OR description:(${genre}))`;
  }

  // Aggressive randomization to avoid repeated results
  const rows = 200; // Fetch more for better variety
  const pageNum = parseInt(page, 10) || 1;

  // Use highly variable random offset (0-1000) to ensure different results each time
  const randomOffset = Math.floor(Math.random() * 1000);
  const startIndex = ((pageNum - 1) * rows) + randomOffset;

  // Randomly select sort order - weight towards less predictable sorts
  const sortOptions = [
    'date desc',
    'date asc',
    'downloads desc',
    'downloads asc',
    'addeddate desc',
    'addeddate asc',
    'titleSorter asc',
    'titleSorter desc',
    'publicdate desc',
    'publicdate asc',
    'random', // Archive.org supports random sort
  ];
  const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];

  const params = new URLSearchParams();
  params.set('q', query);
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'date');
  params.append('fl[]', 'year');
  params.append('fl[]', 'creator');
  params.append('fl[]', 'coverage');
  params.append('fl[]', 'subject');
  params.append('fl[]', 'description');
  params.set('sort[]', randomSort);
  params.set('rows', String(rows));
  params.set('start', String(startIndex));
  params.set('output', 'json');

  const archiveUrl = `https://archive.org/advancedsearch.php?${params.toString()}`;

  const response = await fetch(archiveUrl, {
    headers: { 'User-Agent': 'anamnesis.fm/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Archive.org API error: ${response.status}`);
  }

  const data = await response.json() as {
    response?: { docs?: unknown[]; numFound?: number };
  };

  let items = (data.response?.docs || []).filter(
    (item): item is { identifier: string; creator?: string; title?: string } =>
      typeof item === 'object' && item !== null && 'identifier' in item
  );

  // Deduplicate by creator/show to ensure variety across different shows
  // Instead of getting many episodes from the same show, limit to 2 per creator
  const itemsByCreator = new Map<string, typeof items>();
  for (const item of items) {
    // Use creator if available, otherwise try to extract show name from identifier/title
    const creator = item.creator ||
                    item.identifier?.split('-')[0] ||
                    item.title?.split(' - ')[0] ||
                    'unknown';
    const key = creator.toLowerCase().trim();

    if (!itemsByCreator.has(key)) {
      itemsByCreator.set(key, []);
    }
    itemsByCreator.get(key)!.push(item);
  }

  // Take up to 2 items per creator, then shuffle
  const diverseItems: typeof items = [];
  for (const [_, creatorItems] of itemsByCreator) {
    // Shuffle items within each creator group and take up to 2
    const shuffledCreatorItems = shuffleArray(creatorItems);
    diverseItems.push(...shuffledCreatorItems.slice(0, 2));
  }

  // Shuffle the diverse results for final randomness
  items = shuffleArray(diverseItems);

  return new Response(
    JSON.stringify({
      items,
      page: pageNum,
      count: items.length,
      total: data.response?.numFound || 0,
      collectionsSearched: queryCollections.length,
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // No caching for variety
      },
    }
  );
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

  const archiveUrl = `https://archive.org/metadata/${encodeURIComponent(id)}`;

  const response = await fetch(archiveUrl, {
    headers: { 'User-Agent': 'anamnesis.fm/1.0' },
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
  const date = data.metadata?.date;
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
      title: data.metadata?.title || id,
      creator: data.metadata?.creator,
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
}

async function handleStream(
  path: string,
  request: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!path) {
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

  const response = await fetch(archiveUrl, { headers });

  if (!response.ok && response.status !== 206) {
    throw new Error(`Archive.org stream error: ${response.status}`);
  }

  const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
  const contentLength = response.headers.get('Content-Length');
  const contentRange = response.headers.get('Content-Range');
  const acceptRanges = response.headers.get('Accept-Ranges');

  const responseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400',
    'Accept-Ranges': acceptRanges || 'bytes',
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
// Clients call this every 30 seconds while playing
async function handleHeartbeat(
  env: Env,
  corsHeaders: Record<string, string>,
  request: Request
): Promise<Response> {
  if (!env.LISTENERS) {
    // KV not configured - return gracefully
    return new Response(JSON.stringify({ ok: true, count: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Use client IP as unique identifier (Cloudflare provides this header)
    const clientIp = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0] ||
                     'unknown';
    const clientId = `listener_${clientIp}`;

    // Store heartbeat with 60 second TTL (clients should ping every 30s)
    await env.LISTENERS.put(clientId, '1', { expirationTtl: 60 });

    // Count active listeners
    const list = await env.LISTENERS.list();
    const count = list.keys.length;

    return new Response(JSON.stringify({ ok: true, count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Heartbeat error:', e);
    return new Response(JSON.stringify({ ok: false, count: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get current listener count
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
    const list = await env.LISTENERS.list();
    const count = list.keys.length;

    return new Response(JSON.stringify({ count }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('Listener count error:', e);
    return new Response(JSON.stringify({ count: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
