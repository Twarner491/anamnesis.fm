import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { ERA_RANGES, LOCATIONS, GENRES } from '../lib/constants';

// Check if this is a first-time visitor and generate random initial values
function getRandomInitialValues() {
  if (typeof window === 'undefined') return { era: null, location: null, genre: null };

  // Check if user has visited before
  const hasVisited = localStorage.getItem('radio:hasVisited');
  if (hasVisited) return { era: null, location: null, genre: null };

  // Mark as visited
  localStorage.setItem('radio:hasVisited', 'true');

  // Get random era (exclude 'all')
  const eras = ERA_RANGES.filter(e => e.query !== null);
  const randomEra = eras[Math.floor(Math.random() * eras.length)];

  // Get random location (exclude 'all' and 'antarctica')
  const locations = LOCATIONS.filter(l => l.query !== null && l.query !== 'Antarctica');
  const randomLocation = locations[Math.floor(Math.random() * locations.length)];

  // Get random genre (exclude 'all')
  const genres = GENRES.filter(g => g.query !== null);
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];

  return {
    era: randomEra.query,
    location: randomLocation.query,
    genre: randomGenre.query,
  };
}

// Get initial random values for first-time visitors
const initialValues = typeof window !== 'undefined' ? getRandomInitialValues() : { era: null, location: null, genre: null };

// Era filter (persisted to localStorage)
export const $era = persistentAtom<string | null>('radio:era', initialValues.era, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Location filter (persisted)
export const $location = persistentAtom<string | null>('radio:location', initialValues.location, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Genre filter (persisted)
export const $genre = persistentAtom<string | null>('radio:genre', initialValues.genre, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Safety check: Clear "penguin-radio" genre if location is not Antarctica
// This handles edge cases where users got into a bad state
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const location = $location.get();
    const genre = $genre.get();
    if (genre === 'penguin-radio' && location !== 'Antarctica') {
      console.log('[Filters] Clearing invalid penguin-radio genre (not in Antarctica)');
      $genre.set(null);
    }
  }, 0);
}

// Computed: are any filters active?
export const $hasFilters = computed(
  [$era, $location, $genre],
  (era, location, genre) => !!(era || location || genre)
);

// Computed: build query string for API
export const $filterQuery = computed(
  [$era, $location, $genre],
  (era, location, genre) => {
    const params = new URLSearchParams();
    if (era) params.set('era', era);
    if (location) params.set('location', location);
    if (genre) params.set('genre', genre);
    return params.toString();
  }
);

// Actions
export function setEra(era: string | null) {
  $era.set(era);
}

export function setLocation(location: string | null) {
  $location.set(location);
}

export function setGenre(genre: string | null) {
  $genre.set(genre);
}

export function clearFilters() {
  $era.set(null);
  $location.set(null);
  $genre.set(null);
}
