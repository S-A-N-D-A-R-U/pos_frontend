/**
 * Resolves the base URL for API calls.
 * During local development (npm run dev), it uses the Vite proxy so we return empty string for relative paths.
 * In production, it uses VITE_API_URL if defined, otherwise defaults to relative paths.
 * 
 * @returns {string} The base URL for the API (e.g. 'https://my-server.vercel.app' or '')
 */
export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    // Ensure no trailing slash
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  return '';
}

/**
 * A wrapper around native fetch that automatically prepends the correct API base URL.
 * 
 * @param {string} endpoint - The endpoint path starting with '/' (e.g. '/api/auth/login')
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  return fetch(`${baseUrl}${endpoint}`, options);
}
