import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

const ROLES = [
  { value: 'user', label: 'I need repairs' },
  { value: 'master', label: 'I am a repair master' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'user' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      navigate('/verify', { state: { phone: form.phone, type: 'register' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Create an account</h1>
        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Name
          <input name="name" value={form.name} onChange={onChange} required minLength={2} />
        </label>

        <label>
          Phone
          <input
            type="tel"
            name="phone"
            placeholder="+998901234567"
            value={form.phone}
            onChange={onChange}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={6}
          />
        </label>

        <fieldset className="role-select">
          <legend>I am</legend>
          {ROLES.map((r) => (
            <label key={r.value} className="role-option">
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={form.role === r.value}
                onChange={onChange}
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <Button type="submit" variant="primary" loading={loading}>
          Register
        </Button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
