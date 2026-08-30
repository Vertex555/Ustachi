/* global import.meta */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/socket.io';

/* localStorage is used ONLY for non-sensitive profile-related local
   preferences (e.g. preferred language, theme, saved map center). Uploaded
   media and auth tokens are NEVER stored here. */
export const LOCAL_PREFS_KEY = 'ustachi_prefs';

export const ROLE_LABELS = {
  user: 'User',
  master: 'Master',
  admin: 'Admin',
};

export const ORDER_STATUS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
