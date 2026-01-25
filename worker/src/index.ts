// Cloudflare Worker for anamnesis.fm API proxy
// Handles Archive.org API requests to avoid CORS issues

interface Env {
  CORS_ORIGIN: string;
}

// Archive.org collections - true radio broadcasts with DJs, music, talking, mixing
const COLLECTIONS = [
  // Core radio archives
  'oldtimeradio',
  'hiphopradioarchive',
  'radiostationarchives',
  'radioshowarchive',
  'radiofreecrockett',
  // East Village Radio Archive
  'eastvillageradio',
  'eastvillageradio-mystic-sound',
  'eastvillageradio-minimal-wave',
  'eastvillageradio-peer-pressure',
  'eastvillageradio-the-holy-sh-t-sound-system',
  'eastvillageradio-forty-deuce',
  'eastvillageradio-jamaica-rock',
  'eastvillageradio-pop-goes-the-future',
  'eastvillageradio-the-ragged-phonograph-program',
  'eastvillageradio-radioingrid',
  'eastvillageradio-black-and-blue-take-over',
  // International radio stations
  'radiotiana',
  'radiafm',
  'radioislaminternational',
  'lamosquitera',
  'wjms-radio',
  'osornoradio',
  'ujyaaloradio',
  'wjzmarchive',
  'concertzender',
  'oidradioarchive',
  'radiotrinitatvella',
  'radiovkarchive',
  // Special radio shows
  'SchickeleMix',
  'moodybluesradio',
] as const;

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

  // Build Archive.org query
  const collectionQuery = COLLECTIONS.map((c) => `collection:${c}`).join(' OR ');
  let query = `(${collectionQuery})`;

  // PRIORITY 1: Era/Year filter is STRICT - always applied exactly
  if (era) {
    const [start, end] = era.split('-');
    if (start && end) {
      // Use year field for strict filtering - this is the most important filter
      query += ` AND year:[${start} TO ${end}]`;
    }
  }

  // PRIORITY 2: Location filter
  if (location) {
    query += ` AND (coverage:(${location}) OR title:(${location}) OR description:(${location}) OR creator:(${location}))`;
  }

  // PRIORITY 3: Genre filter (lowest priority, most likely to be relaxed)
  if (genre) {
    query += ` AND (subject:(${genre}) OR title:(${genre}) OR description:(${genre}))`;
  }

  // Fetch more rows to allow for better randomization
  const rows = 100;
  const pageNum = parseInt(page, 10) || 1;

  // Add randomness: use a random starting offset for variety
  // This ensures different results on each search
  const randomOffset = Math.floor(Math.random() * 500);
  const startIndex = ((pageNum - 1) * rows) + randomOffset;

  // Choose a random sort order for variety (but year-filtered results stay correct)
  const sortOptions = [
    'date desc',
    'date asc',
    'downloads desc',
    'addeddate desc',
    'addeddate asc',
    'titleSorter asc',
    'titleSorter desc',
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
    (item): item is { identifier: string } =>
      typeof item === 'object' && item !== null && 'identifier' in item
  );

  // Shuffle results for additional randomness
  items = shuffleArray(items);

  return new Response(
    JSON.stringify({
      items,
      page: pageNum,
      count: items.length,
      total: data.response?.numFound || 0,
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // Reduce cache time to allow for more variety
        'Cache-Control': 'public, max-age=60',
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
      // Only include actual audio files, exclude video formats
      const isAudio = (
        name.endsWith('.mp3') ||
        (name.endsWith('.ogg') && !name.endsWith('.ogv')) || // .ogg but not .ogv (video)
        format.includes('mp3') ||
        format.includes('vbr mp3') ||
        (format.includes('ogg') && !format.includes('video'))
      );
      // Exclude video files
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
