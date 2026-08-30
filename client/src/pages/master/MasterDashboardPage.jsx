import { useEffect, useState } from 'react';
import { masterApi } from '../../services/api';
import Spinner from '../../components/common/Spinner';

export default function MasterDashboardPage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    masterApi
      .me()
      .then((res) => active && setMe(res.master || null))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>Master dashboard</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && !me && (
        <div className="card">
          <p>You don&apos;t have a master profile yet.</p>
          <p className="muted">
            Profile creation will be enabled in the next phase.
          </p>
        </div>
      )}

      {me && (
        <div className="card">
          <p>
            <strong>{me.title || 'Master profile'}</strong>
          </p>
          <p className="muted">⭐ {me.rating?.toFixed(1)} · {me.completedOrders ?? 0} orders</p>
        </div>
      )}
    </div>
  );
}
