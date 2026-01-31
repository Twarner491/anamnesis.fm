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

// Pre-grouped collections by DECADE
// Note: These are approximate - the era of the broadcast, not necessarily the music
const COLLECTIONS_BY_DECADE: Record<string, string[]> = {
  '1930-1939': [
    'oldtimeradio',
    'fibbermcgee',
    'OTRR_Certified_Lux_Radio_Theatre',
    'OrsonWelles_MercuryTheatre',
    'OrsonWelles_CampbellPlayhouse',
  ],

  '1940-1949': [
    'oldtimeradio',
    'suspenseradio',
    'fibbermcgee',
    'abbottandcostelloradio',
    'armedforcesradioservice',
    'radiobooks',
    'OTRR_Certified_Lux_Radio_Theatre',
    'OrsonWelles_MercuryTheatre',
    'OrsonWelles_CampbellPlayhouse',
  ],

  '1950-1959': [
    'oldtimeradio',
    'suspenseradio',
    'fibbermcgee',
    'joy-boys',
    'bobandraytoaster',
    'armedforcesradioservice',
    'pacifica_radio_archives_grammy_2013',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'PirateYearsRadioShowWithPaulPeters',
    'OTRR_Certified_Lux_Radio_Theatre',
  ],

  '1960-1969': [
    'oldtimeradio',
    'joy-boys',
    'bobandraytoaster',
    'pacifica_radio_archives_grammy_2013',
    'armedforcesradioservice',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'EdMorenosTributeToTomPepperChairmanRadioInvictaAutum1964',
    'PirateYearsRadioShowWithPaulPeters',
  ],

  '1970-1979': [
    'bobandraytoaster',
    'radiofreecrockett',
    'pacifica_radio_archives_grammy_2013',
    'imus-in-the-morning',
    'armedforcesradioservice',
    'radiobooks',
    'sraa-voice-of-kenya-circa-1975',
    'radio-pakistan-general-overseas-svc-han',
    'sraa-syrian-radio-amp-television-1970s-recording',
    'PirateYearsRadioShowWithPaulPeters',
  ],

  '1980-1989': [
    'hiphopradioarchive',
    'radiofreecrockett',
    '2600-off-the-hook',
    'FM99_WNOR_Tommy_and_Rumble',
    'pacifica_radio_archives_grammy_2013',
    'imus-in-the-morning',
    'armedforcesradioservice',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'death-is-not-the-end-london-pirate-radio-adverts-1984-1993-vol.-1',
    'uk-rave-mixtapes-1988-1993-complete',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
    'PirateYearsRadioShowWithPaulPeters',
  ],

  '1990-1999': [
    'hiphopradioarchive',
    'uprisingradio',
    'eastvillageradio-the-bobbito-garcia-radio-show',
    'imus-in-the-morning',
    '2600-off-the-hook',
    'FM99_WNOR_Tommy_and_Rumble',
    'pacifica_radio_archives_grammy_2013',
    'Radio-BBC-Radio-5-Live',
    'armedforcesradioservice',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'uk-rave-mixtapes-1988-1993-complete',
    'death-is-not-the-end-london-pirate-radio-adverts-1984-1993-vol.-1',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
    'PirateYearsRadioShowWithPaulPeters',
  ],

  '2000-2009': [
    'eastvillageradio',
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
    'Radio-BBC-Radio-5-Live',
    '2600-off-the-hook',
    'FM99_WNOR_Tommy_and_Rumble',
    'alanwattarchive',
    'wyceradio',
    'concertzender',
    'imus-in-the-morning',
    'armedforcesradioservice',
    'uprisingradio',
    'pacifica_radio_archives_grammy_2013',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'hiphopradioarchive',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
    'stalking-the-nightmare-radio',
  ],

  '2010-2019': [
    'eastvillageradio',
    'Radio-BBC-Radio-5-Live',
    'concertzender',
    'ujyaaloradio',
    'cairopublicradio',
    'osornoradio',
    'lamosquitera',
    'radiocaracasradio',
    'wyceradio',
    'alanwattarchive',
    '2600-off-the-hook',
    'armedforcesradioservice',
    'pacifica_radio_archives_grammy_2013',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'uprisingradio',
    'vanzemlja-sounds',
    'ShortwavePirateRadio',
    'shortwave-pirate-radio-studio-recordings',
    'utmafolkshow',
    'sraa-radio-thailand-june-13-2016',
    // Ghana stations
    'modernghanaradiocenterrewind-2010-daasebreonhighliferadiolive',
    '2ModernGhanaRadioCenteronlineAudioConverter.comHIGHLIFERADIOARCHIVESDAASEBRETIME',
    'GHANAARCHIVES-EMERGINGCOMMUNITYRADIOKAKAGHANAMEDIA-NKWAFM',
    'G.A.DABLEKUMAOPAMFORADIO',
  ],

  '2020-2029': [
    'Radio-BBC-Radio-5-Live',
    'radiowombat',
    'cairopublicradio',
    'radiostationarchives',
    'radioshowarchive',
    'radioprograms',
    'wyceradio',
    'concertzender',
    '2600-off-the-hook',
    'armedforcesradioservice',
    'radiobooks',
    'radio-pakistan-general-overseas-svc-han',
    'vanzemlja-sounds',
    'ShortwavePirateRadio',
    'GHANAARCHIVES-EMERGINGCOMMUNITYRADIOKAKAGHANAMEDIA-NKWAFM',
  ],
};

// Get collections filtered by criteria
function getFilteredCollections(
  era: string | null,
  location: string | null,
  genre: string | null
): string[] {
  let collections = new Set<string>(ALL_RADIO_COLLECTIONS);

  // Filter by era/decade if specified
  if (era && COLLECTIONS_BY_DECADE[era]) {
    collections = new Set(COLLECTIONS_BY_DECADE[era]);
  }

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
    return [...ALL_RADIO_COLLECTIONS];
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
      } else if (url.pathname === '/api/penguin-radio') {
        // Easter egg: Antarctica's Penguin Radio - SoundCloud playlist
        return handlePenguinRadio(corsHeaders);
      } else if (url.pathname.startsWith('/api/soundcloud-stream/')) {
        // Stream audio from SoundCloud
        const trackUrl = decodeURIComponent(url.pathname.replace('/api/soundcloud-stream/', ''));
        return handleSoundCloudStream(trackUrl, request, corsHeaders);
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
  try {
    const era = url.searchParams.get('era');
    const location = url.searchParams.get('location');
    const genre = url.searchParams.get('genre');
    const page = url.searchParams.get('page') || '1';
    // Parse excluded identifiers (recently played tracks to avoid)
    const excludeParam = url.searchParams.get('exclude');
    const excludeIds = new Set(excludeParam ? excludeParam.split(',').filter(id => id.trim()) : []);

    // Get pre-filtered collections based on filters
    const collections = getFilteredCollections(era, location, genre);
    const pageNum = parseInt(page, 10) || 1;

    // MULTI-QUERY APPROACH: Make 3 parallel queries with different sorts/offsets
    // This gives us different "slices" of Archive.org's data for better diversity
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
      'random',
    ];

    // Pick 3 different sort strategies
    const shuffledSorts = shuffleArray([...sortOptions]);
    const selectedSorts = shuffledSorts.slice(0, 3);

    // Build the base query (same for all requests)
    const buildBaseQuery = (queryCollections: string[]) => {
      const collectionQuery = queryCollections.map((c) => `collection:${c}`).join(' OR ');
      let query = `(${collectionQuery})`;

      // PRIORITY 1: Era/Year filter is STRICT - always applied exactly
      if (era) {
        const [start, end] = era.split('-');
        if (start && end) {
          query += ` AND year:[${start} TO ${end}]`;
        }
      }

      // PRIORITY 2: Location filter
      if (location) {
        query += ` AND (coverage:(${location}) OR title:(${location}) OR description:(${location}) OR creator:(${location}))`;
      }

      // PRIORITY 3: Genre filter
      if (genre) {
        query += ` AND (subject:(${genre}) OR title:(${genre}) OR description:(${genre}))`;
      }

      return query;
    };

    // Create 3 parallel fetch requests with different collection subsets and sorts
    const fetchPromises = selectedSorts.map(async (sortOrder, index) => {
      // Each query gets a different random subset of collections
      let queryCollections = collections;
      if (collections.length > 8) {
        const shuffledCollections = shuffleArray([...collections]);
        const subsetSize = 5 + Math.floor(Math.random() * 8);
        queryCollections = shuffledCollections.slice(0, Math.min(subsetSize, collections.length));
      }

      const query = buildBaseQuery(queryCollections);
      const rows = 150; // Fetch 150 per query, 3 queries = up to 450 items

      // Each query uses a different offset range to hit different parts of the data
      const baseOffset = index * 500; // 0, 500, 1000
      const randomOffset = sortOrder === 'random' ? 0 : baseOffset + Math.floor(Math.random() * 500);
      const startIndex = ((pageNum - 1) * rows) + randomOffset;

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
      params.set('sort[]', sortOrder);
      params.set('rows', String(rows));
      params.set('start', String(startIndex));
      params.set('output', 'json');

      const archiveUrl = `https://archive.org/advancedsearch.php?${params.toString()}`;

      try {
        const response = await fetch(archiveUrl, {
          headers: { 'User-Agent': 'anamnesis.fm/1.0' },
        });

        if (!response.ok) {
          console.error(`Query ${index} failed: ${response.status}`);
          return { items: [], numFound: 0 };
        }

        const data = await response.json() as {
          response?: { docs?: unknown[]; numFound?: number };
        };

        return {
          items: (data.response?.docs || []).filter(
            (item): item is { identifier: string; creator?: string; title?: string } =>
              typeof item === 'object' && item !== null && 'identifier' in item
          ),
          numFound: data.response?.numFound || 0,
        };
      } catch (e) {
        console.error(`Query ${index} error:`, e);
        return { items: [], numFound: 0 };
      }
    });

    // Wait for all queries to complete
    const results = await Promise.all(fetchPromises);

    console.log(`Multi-query results: ${results.map((r, i) => `Q${i}=${r.items.length}`).join(', ')}`);

    // Merge and deduplicate results by identifier
    const seenIds = new Set<string>();
    let allItems: { identifier: string; creator?: string; title?: string }[] = [];

    for (const result of results) {
      for (const item of result.items) {
        if (!seenIds.has(item.identifier)) {
          seenIds.add(item.identifier);
          allItems.push(item);
        }
      }
    }

    // Filter out recently played tracks
    if (excludeIds.size > 0) {
      const beforeCount = allItems.length;
      allItems = allItems.filter(item => !excludeIds.has(item.identifier));
      console.log(`Filtered out ${beforeCount - allItems.length} recently played tracks`);
    }

    // Deduplicate by creator/show for variety across different shows
    const itemsByCreator = new Map<string, typeof allItems>();
    for (const item of allItems) {
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

    // Take 1 item per creator for maximum variety
    const diverseItems: typeof allItems = [];
    for (const [_, creatorItems] of itemsByCreator) {
      const shuffledCreatorItems = shuffleArray(creatorItems);
      diverseItems.push(shuffledCreatorItems[0]);
    }

    // Final shuffle
    const items = shuffleArray(diverseItems);

    const totalFound = Math.max(...results.map(r => r.numFound));

    console.log(`Search: era=${era}, location=${location}, genre=${genre} -> ${items.length} diverse items from ${allItems.length} unique`);

    return new Response(
      JSON.stringify({
        items,
        page: pageNum,
        count: items.length,
        total: totalFound,
        collectionsSearched: collections.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Search failed', items: [], count: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
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

const PENGUIN_RADIO_PLAYLIST_URL = 'https://soundcloud.com/teddy-warner-910871598/sets/antartica-fm';

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
    const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(PENGUIN_RADIO_PLAYLIST_URL)}&client_id=${SOUNDCLOUD_CLIENT_ID}`;

    const response = await fetch(resolveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
        'Accept': 'application/json',
      },
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
          'Cache-Control': 'no-cache, no-store, must-revalidate', // No caching - shuffle each time
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
  try {
    // Get stream URL from SoundCloud API v2
    const trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${SOUNDCLOUD_CLIENT_ID}`;

    const trackResponse = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!trackResponse.ok) {
      throw new Error(`Failed to get track info: ${trackResponse.status}`);
    }

    const track = await trackResponse.json() as SoundCloudTrack;

    // Find the best transcoding (prefer progressive mp3)
    const transcodings = track.media?.transcodings || [];
    const progressive = transcodings.find(t => t.format.protocol === 'progressive');
    const hls = transcodings.find(t => t.format.protocol === 'hls');

    const transcoding = progressive || hls;
    if (!transcoding) {
      throw new Error('No stream URL available for this track');
    }

    // Get the actual stream URL
    const streamUrlResponse = await fetch(`${transcoding.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anamnesis.fm/1.0)',
      },
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
