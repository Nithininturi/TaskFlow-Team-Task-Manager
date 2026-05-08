import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Shield, User } from 'lucide-react';

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={20} color="white" /></div>
          <span className="auth-logo-text">TaskFlow</span>
        </div>

        <h1 className="auth-title">Create your workspace</h1>
        <p className="auth-subtitle">Start managing your team's tasks</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>@</span>
              <input
                type="text"
                className="form-input"
                placeholder="yourhandle"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                required
                minLength={3}
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">I am joining as…</label>
            <div className="role-selector">
              <div
                className={`role-option ${form.role === 'admin' ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, role: 'admin' }))}
              >
                <div className="role-option-icon"><Shield size={24} color={form.role === 'admin' ? 'var(--primary-light)' : 'var(--text-muted)'} /></div>
                <div className="role-option-label" style={{ color: form.role === 'admin' ? 'var(--text-primary)' : 'var(--text-muted)' }}>Admin</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Full control</div>
              </div>
              <div
                className={`role-option ${form.role === 'member' ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, role: 'member' }))}
              >
                <div className="role-option-icon"><User size={24} color={form.role === 'member' ? 'var(--primary-light)' : 'var(--text-muted)'} /></div>
                <div className="role-option-label" style={{ color: form.role === 'member' ? 'var(--text-primary)' : 'var(--text-muted)' }}>Member</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Collaborate</div>
              </div>
            </div>
          </div>

          {error && <div className="error-banner">⚠ {error}</div>}

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}
            style={{ marginTop: 4, justifyContent: 'center' }}>
            {loading ? (
              <><span className="loading-spinner" style={{ width: 16, height: 16 }} /> Creating account…</>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
