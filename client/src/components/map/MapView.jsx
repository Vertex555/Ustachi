import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons in bundlers.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Interactive Leaflet map with OpenStreetMap tiles.
 * `masters` items: [{ _id, name, rating, location: { coordinates: [lng,lat] } }]
 */
export default function MapView({ center = [41.3111, 69.2797], zoom = 11, masters = [], onSelect }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {masters.map((m) => {
        const [lng, lat] = m.location?.coordinates || [0, 0];
        if (!lng && !lat) return null;
        return (
          <Marker
            key={m._id}
            position={[lat, lng]}
            eventHandlers={{ click: () => onSelect && onSelect(m) }}
          >
            <Popup>
              <strong>{m.name || 'Master'}</strong>
              <br />
              ⭐ {m.rating ? m.rating.toFixed(1) : '—'}
              {onSelect && (
                <>
                  <br />
                  <button type="button" onClick={() => onSelect(m)}>
                    View profile
                  </button>
                </>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
