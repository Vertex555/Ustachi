import { useEffect, useState, useCallback } from 'react';

/**
 * Geolocation hook: request the browser's location (Leaflet/OSM uses these
 * coordinates for maps and distance filtering).
 */
export function useGeo() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { position, error, loading, locate };
}
