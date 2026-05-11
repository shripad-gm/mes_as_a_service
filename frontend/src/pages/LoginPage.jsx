import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={22} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>MES Platform</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Manufacturing Execution System</div>
          </div>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label"><Mail size={13} style={{ display:'inline', marginRight:6 }} />Email</label>
            <input id="login-email" type="email" className="form-input" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={13} style={{ display:'inline', marginRight:6 }} />Password</label>
            <input id="login-password" type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={set('password')} required />
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary w-full" style={{ justifyContent:'center', marginTop:8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-secondary)' }}>
          No account? <Link to="/register" style={{ color:'var(--accent)' }}>Register your organisation</Link>
        </p>
      </div>
    </div>
  );
}
