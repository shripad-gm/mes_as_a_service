import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName:'', fullName:'', email:'', password:'', phone:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register(form); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={22} color="#fff" /></div>
          <div>
            <div style={{ fontWeight:700, fontSize:18 }}>MES Platform</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Manufacturing Execution System</div>
          </div>
        </div>
        <h1 className="auth-title">Create your workspace</h1>
        <p className="auth-subtitle">Register your organisation and admin account</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Organisation Name</label>
            <input id="reg-org" className="form-input" placeholder="Acme Manufacturing" value={form.orgName} onChange={set('orgName')} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input id="reg-name" className="form-input" placeholder="Jane Smith" value={form.fullName} onChange={set('fullName')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input id="reg-phone" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="reg-email" type="email" className="form-input" placeholder="admin@company.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="reg-password" type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
          </div>
          <button id="reg-submit" type="submit" className="btn btn-primary w-full" style={{ justifyContent:'center', marginTop:8 }} disabled={loading}>
            {loading ? 'Creating workspace…' : 'Create Workspace'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color:'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
