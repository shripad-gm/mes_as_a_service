import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword } from '../api/auth.js';
import Layout from '../components/Layout.jsx';
import { PageHeader } from '../components/UI.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg('Password changed. You can now log in with your new password.');
      setForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { setError(err.response?.data?.message || 'Failed to change password'); }
    setLoading(false);
  };

  return (
    <Layout title="Settings">
      <PageHeader title="Settings" subtitle="Account and workspace settings" />

      <div className="grid grid-2 gap-6">
        <div className="card card-pad">
          <h3 className="font-semibold mb-4">Profile</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div><p className="text-muted text-sm">Full Name</p><p className="font-semibold">{user?.fullName}</p></div>
            <div><p className="text-muted text-sm">Email</p><p>{user?.email}</p></div>
            <div><p className="text-muted text-sm">Role</p><p>{user?.role}</p></div>
            <div><p className="text-muted text-sm">Organisation</p><p>{user?.organization?.name}</p></div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="font-semibold mb-4">Change Password</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Current Password</label><input type="password" className="form-input" value={form.currentPassword} onChange={set('currentPassword')} required /></div>
            <div className="form-group"><label className="form-label">New Password</label><input type="password" className="form-input" value={form.newPassword} onChange={set('newPassword')} required minLength={8} /></div>
            <div className="form-group"><label className="form-label">Confirm New Password</label><input type="password" className="form-input" value={form.confirm} onChange={set('confirm')} required /></div>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Change Password'}</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
