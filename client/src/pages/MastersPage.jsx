import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { masterApi } from '../services/api';
import { useGeo } from '../hooks/useGeo';
import MapView from '../components/map/MapView';
import Spinner from '../components/common/Spinner';

export default function MastersPage() {
  const { position } = useGeo();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingFilter, setRatingFilter] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    masterApi
      .list({ page: 1, pageSize: 50, rating: ratingFilter || undefined })
      .then((res) => active && setMasters(res.masters || []))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ratingFilter]);

  const center = position ? [position.lat, position.lng] : [41.3111, 69.2797];

  return (
    <div className="container">
      <div className="page-head">
        <h1>Repair masters</h1>
        <label className="inline-filter">
          Min rating
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="">Any</option>
            <option value="4.5">4.5+</option>
            <option value="4">4+</option>
            <option value="3">3+</option>
          </select>
        </label>
      </div>

      <div className="masters-layout">
        <div className="masters-map">
          <MapView center={center} masters={masters} />
        </div>

        <div className="masters-list">
          {loading && <Spinner />}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && masters.length === 0 && (
            <div className="alert">No masters found.</div>
          )}

          {masters.map((m) => (
            <Link key={m._id} to={`/masters/${m._id}`} className="master-card">
              <div className="master-card-head">
                <div className="avatar">{m.user?.name?.charAt(0) || 'M'}</div>
                <div>
                  <strong>{m.user?.name || m.title}</strong>
                  <span className="muted">
                    {m.title} · ⭐ {m.rating ? m.rating.toFixed(1) : 'new'}
                  </span>
                </div>
              </div>
              {m.bio && <p className="master-card-bio">{m.bio}</p>}
              <div className="master-card-meta">
                <span>{m.completedOrders ?? 0} orders</span>
                <span>{m.skills?.slice(0, 3).join(', ')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
