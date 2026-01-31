import type { EraOption, LocationOption, GenreOption } from '../types';

// FM dial maps to decades (88.0 - 108.0 MHz visual range)
// Note: Collections start from 1930s
export const ERA_RANGES: EraOption[] = [
  { id: 'all', label: 'ALL', query: null, position: 0 },
  { id: '1930s', label: "'30s", query: '1930-1939', position: 16 },
  { id: '1940s', label: "'40s", query: '1940-1949', position: 32 },
  { id: '1950s', label: "'50s", query: '1950-1959', position: 48 },
  { id: '1960s', label: "'60s", query: '1960-1969', position: 64 },
  { id: '1970s', label: "'70s", query: '1970-1979', position: 80 },
  { id: '1980s', label: "'80s", query: '1980-1989', position: 96 },
  { id: '1990s', label: "'90s", query: '1990-1999', position: 112 },
  { id: '2000s', label: "'00s", query: '2000-2009', position: 128 },
  { id: '2010s', label: "'10s", query: '2010-2019', position: 144 },
  { id: '2020s', label: "'20s", query: '2020-2029', position: 160 },
];

// FM frequency display range
export const FM_RANGE = { min: 88.0, max: 108.0 };

// Location options - continent-based for broader coverage
export const LOCATIONS: LocationOption[] = [
  { id: 'all', label: 'WORLD', query: null },
  { id: 'north-america', label: 'N. AMER', query: 'North America' },
  { id: 'south-america', label: 'S. AMER', query: 'South America' },
  { id: 'europe', label: 'EUROPE', query: 'Europe' },
  { id: 'asia', label: 'ASIA', query: 'Asia' },
  { id: 'middle-east', label: 'MID EAST', query: 'Middle East' },
  { id: 'africa', label: 'AFRICA', query: 'Africa' },
  { id: 'australia', label: 'AUSTRLA', query: 'Australia' },
  { id: 'antarctica', label: 'ANTRCTC', query: 'Antarctica' }, // Easter egg!
];

// Genre options - new simplified system
// ALL: Multi-genre stations, FOLK: Folk music, JAZZ: Jazz music, HIPHOP: Hip-hop,
// CLASSICAL: Classical, COUNTRY/BLUES: Combined, ELECTRONIC: Electronic/dance/techno,
// TALK: News/sports/comedy/drama, ROCK: Rock music
export const GENRES: GenreOption[] = [
  { id: 'all', label: 'ALL', query: null },
  { id: 'folk', label: 'FOLK', query: 'folk' },
  { id: 'jazz', label: 'JAZZ', query: 'jazz' },
  { id: 'hiphop', label: 'HIP-HOP', query: 'hiphop' },
  { id: 'classical', label: 'CLASS', query: 'classical' },
  { id: 'country-blues', label: 'CNTRY/BL', query: 'country/blues' },
  { id: 'electronic', label: 'ELEC', query: 'electronic' },
  { id: 'talk', label: 'TALK', query: 'talk' },
  { id: 'rock', label: 'ROCK', query: 'rock' },
];

// Special genre for Antarctica easter egg
export const PENGUIN_RADIO_GENRE: GenreOption = {
  id: 'penguin-radio',
  label: 'PENGUIN',
  query: 'penguin-radio', // Special marker for SoundCloud playlist
};

// Check if location is Antarctica (easter egg)
export const isAntarctica = (locationQuery: string | null) => locationQuery === 'Antarctica';

// Archive.org collections to aggregate
// Comprehensive list of radio and audio collections for maximum variety
export const COLLECTIONS = [
  // === CORE RADIO ARCHIVES ===
  'oldtimeradio',              // Classic radio dramas, news, music from 1920s-1950s
  'radioprograms',             // Radio Show and Programs Archive - massive collection
  'radio',                     // General radio collection
  'fmradioarchive',            // FM radio recordings

  // === LIVE MUSIC ARCHIVES ===
  'etree',                     // Live Music Archive - trade-friendly concerts (massive)
  'GratefulDead',              // Grateful Dead live recordings
  'PhilLeshAndFriends',        // Phil Lesh concerts
  'JerryGarcia',               // Jerry Garcia Band recordings
  'furthur',                   // Furthur band recordings
  'Ratdog',                    // Ratdog recordings

  // === HIP-HOP & RAP ===
  'hiphopradioarchive',        // Hip-hop radio recordings

  // === INTERNATIONAL RADIO ===
  'VOANewscasts',              // Voice of America - 86,000+ newscasts
  'bbcradio',                  // BBC radio programs
  'cbc_radio',                 // CBC Canadian radio
  'radioarchive',              // International radio archive

  // === MUSIC COLLECTIONS ===
  'audio_music',               // Music, Arts & Culture collection
  '78rpm',                     // 78 RPM vintage recordings
  '78rpm_bostonpubliclibrary', // Boston Public Library 78s
  'georgeblood',               // George Blood 78 RPM transfers (high quality)
  'free_music',                // Free music archive
  'netlabels',                 // Creative Commons netlabel music
  'audio',                     // General audio collection

  // === JAZZ ===
  'jazz',                      // Jazz collection
  'jazzlibrary',               // Jazz recordings

  // === CLASSICAL ===
  'classical',                 // Classical music
  'audio_religion',            // Religious audio (includes choir, hymns)

  // === WORLD MUSIC ===
  'african_music',             // African music
  'india_music',               // Indian music
  'arabian_music',             // Arabian/Middle Eastern music
  'latinamerica',              // Latin American audio

  // === SPOKEN WORD / TALK ===
  'librivox',                  // LibriVox audiobooks
  'audio_bookspoetry',         // Books and poetry readings
  'podcasts',                  // Podcasts collection

  // === NEWS & DOCUMENTARY ===
  'newsandpublicaffairs',      // News and public affairs

  // === COMMUNITY AUDIO ===
  'opensource_audio',          // Community uploaded audio
  'audio_foreign',             // Foreign language audio
] as const;

export type CollectionId = typeof COLLECTIONS[number];
