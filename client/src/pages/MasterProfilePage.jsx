import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { masterApi } from '../services/api';
import MapView from '../components/map/MapView';
import Spinner from '../components/common/Spinner';

export default function MasterProfilePage() {
  const { id } = useParams();
  const [master, setMaster] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    masterApi
      .get(id)
      .then((res) => active && setMaster(res.master))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!master) return <div className="alert">Master not found</div>;

  const coords = master.location?.coordinates;

  return (
    <div className="container">
      <div className="card master-profile">
        <div className="master-card-head">
          <div className="avatar avatar-lg">
            {master.user?.name?.charAt(0) || 'M'}
          </div>
          <div>
            <h1>{master.user?.name}</h1>
            <div className="muted">{master.title}</div>
            <div>
              ⭐ {master.rating ? master.rating.toFixed(1) : 'new'} ·{' '}
              {master.completedOrders ?? 0} orders · {master.reviewCount ?? 0} reviews
            </div>
          </div>
        </div>

        {master.bio && <p>{master.bio}</p>}
        {master.yearsOfExperience > 0 && (
          <p className="muted">{master.yearsOfExperience} years of experience</p>
        )}

        {master.skills?.length > 0 && (
          <div className="chips">
            {master.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        )}

        {coords && (
          <div className="profile-map">
            <MapView center={[coords[1], coords[0]]} zoom={13} />
          </div>
        )}

        <Link to={`/account`} className="btn btn-primary">
          Request repair
        </Link>
      </div>
    </div>
  );
}
