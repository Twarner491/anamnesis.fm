import type { EraOption, LocationOption, GenreOption } from '../types';

// FM dial maps to decades (88.0 - 108.0 MHz visual range)
export const ERA_RANGES: EraOption[] = [
  { id: 'all', label: 'ALL', query: null, position: 0 },
  { id: '1920s', label: "'20s", query: '1920-1929', position: 16 },
  { id: '1930s', label: "'30s", query: '1930-1939', position: 32 },
  { id: '1940s', label: "'40s", query: '1940-1949', position: 48 },
  { id: '1950s', label: "'50s", query: '1950-1959', position: 64 },
  { id: '1960s', label: "'60s", query: '1960-1969', position: 80 },
  { id: '1970s', label: "'70s", query: '1970-1979', position: 96 },
  { id: '1980s', label: "'80s", query: '1980-1989', position: 112 },
  { id: '1990s', label: "'90s", query: '1990-1999', position: 128 },
  { id: '2000s', label: "'00s", query: '2000-2009', position: 144 },
  { id: '2010s', label: "'10s", query: '2010-2019', position: 160 },
  { id: '2020s', label: "'20s", query: '2020-2029', position: 176 },
];

// FM frequency display range
export const FM_RANGE = { min: 88.0, max: 108.0 };

// Location options based on Archive.org coverage field
// Simplified to country-level with key US cities
export const LOCATIONS: LocationOption[] = [
  { id: 'all', label: 'WORLD', query: null },
  // Americas
  { id: 'us', label: 'USA', query: 'United States OR USA OR US OR America' },
  { id: 'us-ny', label: 'NYC', query: 'New York OR NYC OR WNYC OR WNEW' },
  { id: 'us-ca', label: 'LA', query: 'Los Angeles OR KCRW OR California' },
  { id: 'canada', label: 'CAN', query: 'Canada OR Canadian OR CBC' },
  { id: 'mexico', label: 'MEX', query: 'Mexico OR Mexican' },
  { id: 'brazil', label: 'BRA', query: 'Brazil OR Brazilian OR Brasil' },
  // Europe
  { id: 'uk', label: 'UK', query: 'United Kingdom OR UK OR Britain OR BBC OR England' },
  { id: 'de', label: 'GER', query: 'Germany OR German OR Deutschland' },
  { id: 'fr', label: 'FRA', query: 'France OR French OR Paris' },
  // Africa & Middle East
  { id: 'africa', label: 'AFR', query: 'Africa OR African OR Morocco OR South Africa OR Kenya' },
  // Asia & Pacific
  { id: 'jp', label: 'JPN', query: 'Japan OR Japanese OR Tokyo' },
  { id: 'au', label: 'AUS', query: 'Australia OR Australian' },
];

// Genre options based on Archive.org subject field
// Using broader search terms for better matching
export const GENRES: GenreOption[] = [
  { id: 'all', label: 'ALL', query: null },
  // Music genres
  { id: 'music', label: 'MUSIC', query: 'music OR concert OR live' },
  { id: 'jazz', label: 'JAZZ', query: 'jazz OR bebop OR swing OR big band' },
  { id: 'blues', label: 'BLUES', query: 'blues OR rhythm and blues OR R&B' },
  { id: 'rock', label: 'ROCK', query: 'rock OR rock and roll OR alternative OR indie' },
  { id: 'hiphop', label: 'HIP-HOP', query: 'hip hop OR hiphop OR hip-hop OR rap' },
  { id: 'soul', label: 'SOUL', query: 'soul OR funk OR motown OR R&B' },
  { id: 'classical', label: 'CLASS', query: 'classical OR symphony OR orchestra OR opera' },
  { id: 'country', label: 'CNTRY', query: 'country OR folk OR bluegrass OR western' },
  { id: 'world', label: 'WORLD', query: 'world music OR reggae OR latin OR afrobeat' },
  { id: 'electronic', label: 'ELEC', query: 'electronic OR techno OR house OR EDM OR dance' },
  // Talk/Spoken word
  { id: 'news', label: 'NEWS', query: 'news OR newscast OR bulletin OR current affairs' },
  { id: 'talk', label: 'TALK', query: 'talk OR interview OR discussion OR call-in' },
  { id: 'drama', label: 'DRAMA', query: 'drama OR theatre OR theater OR radio play OR mystery' },
  { id: 'comedy', label: 'COMEDY', query: 'comedy OR humor OR humour OR funny' },
  { id: 'sports', label: 'SPORT', query: 'sports OR baseball OR football OR basketball' },
  { id: 'documentary', label: 'DOC', query: 'documentary OR history OR historical' },
];

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
