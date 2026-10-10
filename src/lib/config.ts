const API_BASE_URL = import.meta.env.PUBLIC_API_URL ||
  (import.meta.env.DEV ? '' : 'https://anamnesis-api.teddy-557.workers.dev');

export function apiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
