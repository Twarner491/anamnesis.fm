// API configuration
// In development, use local API routes
// In production (GitHub Pages), use Cloudflare Worker

// The API URL can be overridden via environment variable or by editing this file
// After deploying the Cloudflare Worker, update this URL
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '';

// Helper to build API URLs
export function apiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // If no API_BASE_URL is set, use relative URLs (works in dev with Astro server)
  if (!API_BASE_URL) {
    return `/${cleanPath}`;
  }

  // Otherwise, use the configured API URL
  return `${API_BASE_URL}/${cleanPath}`;
}
