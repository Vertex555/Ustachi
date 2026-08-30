import { useCallback } from 'react';
import { http } from '../services/apiClient';

/**
 * Thin wrapper around the shared http client so components can call the API
 * without importing the client directly. Kept for future request-dedup/caching.
 */
export default function useApi() {
  const get = useCallback((url, config) => http.get(url, config), []);
  const post = useCallback((url, body, config) => http.post(url, body, config), []);
  const patch = useCallback((url, body, config) => http.patch(url, body, config), []);
  const del = useCallback((url, config) => http.delete(url, config), []);
  return { get, post, patch, del };
}
