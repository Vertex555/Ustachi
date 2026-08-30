import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export default function VerifyPage() {
  const { state } = useLocation();
  const phone = state?.phone || '';
  const type = state?.type || 'register';

  const { verify } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ phone, code, type });
      if (res.devCode && res.devCode !== undefined) setDevCode(res.devCode);
      if (res.user) {
        navigate(res.user.role === 'master' ? '/master' : '/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If no phone was passed (direct navigation), show a preamble.
  if (!phone) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Verify your phone</h1>
          <p>
            Please go back to login/register and enter your phone to receive a
            verification code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Enter verification code</h1>
        <p className="muted">We sent a 6-digit code to {phone}</p>

        {error && <div className="alert alert-error">{error}</div>}
        {devCode && (
          <div className="alert alert-info">
            Dev code (Telegram not configured): <strong>{devCode}</strong>
          </div>
        )}

        <label>
          Code
          <input
            inputMode="numeric"
            name="code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>

        <Button type="submit" variant="primary" loading={loading}>
          Verify
        </Button>
      </form>
    </div>
  );
}
