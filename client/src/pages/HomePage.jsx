import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '../services/api';

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    healthApi
      .check()
      .then((res) => setHealth(res))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Find a trusted repair master near you</h1>
          <p>
            Describe your broken device, upload photos, and get matched with
            verified repair professionals by rating and distance.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get started
            </Link>
            <Link to="/masters" className="btn btn-outline btn-lg">
              Browse masters
            </Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2>Backend status</h2>
        {health ? (
          <div className="status-card ok">
            <div>
              <strong>API connected</strong>
              <span>
                status: {health.status} · db: {health.db} · env: {health.env}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="status-card fail">
            <strong>API unreachable</strong>
            <span>{error}</span>
          </div>
        ) : (
          <div className="status-card">Checking…</div>
        )}
      </section>
    </div>
  );
}
