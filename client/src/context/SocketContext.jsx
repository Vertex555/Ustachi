import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }
    // Access token is HttpOnly; for sockets we pass it via handshake. In a full
    // implementation the client would receive an ephemeral socket token.
    // Here we rely on cookie transport fallback; see socketService note.
    const s = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  const emit = useCallback(
    (event, payload) => {
      if (socket) socket.emit(event, payload);
    },
    [socket]
  );

  const on = useCallback(
    (event, handler) => {
      if (!socket) return () => {};
      socket.on(event, handler);
      return () => socket.off(event, handler);
    },
    [socket]
  );

  const value = useMemo(
    () => ({ socket, connected, emit, on }),
    [socket, connected, emit, on]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
