import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// Era filter (persisted to localStorage)
export const $era = persistentAtom<string | null>('radio:era', null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Location filter (persisted)
export const $location = persistentAtom<string | null>('radio:location', null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Genre filter (persisted)
export const $genre = persistentAtom<string | null>('radio:genre', null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

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
