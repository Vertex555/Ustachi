import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Normalize backend error envelope:
 *   { success:false, error:{ code, message, details } }
 * into a readable Error with a `.code` and `.details`.
 */
function normalizeError(error) {
  if (error.response && error.response.data && error.response.data.error) {
    const { code, message, details } = error.response.data.error;
    const err = new Error(message);
    err.code = code;
    err.status = error.response.status;
    err.details = details;
    return err;
  }
  if (error.request) {
    const err = new Error('Network error — could not reach the server');
    err.code = 'NETWORK_ERROR';
    return err;
  }
  return error;
}

api.interceptors.response.use(
  (response) => response.data, // unwrap envelope? keep handler-level unwrap
  (error) => Promise.reject(normalizeError(error))
);

/**
 * Convenience wrappers returning the envelope payload.
 * Backend wraps data in { success, data, meta }. Extract `data`.
 */
const wrap = (promise) => promise.then((res) => res.data);

export const http = {
  get: (url, config) => wrap(api.get(url, config)),
  post: (url, body, config) => wrap(api.post(url, body, config)),
  patch: (url, body, config) => wrap(api.patch(url, body, config)),
  put: (url, body, config) => wrap(api.put(url, body, config)),
  delete: (url, config) => wrap(api.delete(url, config)),
};

export default api;
