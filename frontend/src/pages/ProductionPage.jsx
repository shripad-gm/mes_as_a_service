import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, StatCard } from '../components/UI.jsx';
import { floorDashboard, getBottlenecks, getEfficiency, createLog } from '../api/production.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { TrendingUp, AlertTriangle, Plus } from 'lucide-react';

export default function ProductionPage() {
  const { can } = useAuth();
  const [floor, setFloor] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [eff, setEff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logModal, setLogModal] = useState(false);
  const [form, setForm] = useState({ workOrderId:'', operationId:'', pieces:1, defects:0, rework:0, notes:'' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [f, b, e] = await Promise.allSettled([floorDashboard(), getBottlenecks(), getEfficiency()]);
    setFloor(f.value?.data?.data);
    setBottlenecks(b.value?.data?.data || []);
    setEff(e.value?.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitLog = async (ev) => {
    ev.preventDefault(); setSaving(true);
    try { await createLog(form); setLogModal(false); load(); } catch {}
    setSaving(false);
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  if (loading) return <Layout title="Production Floor"><Loader /></Layout>;

  return (
    <Layout title="Production Floor">
      <PageHeader title="Production Floor" subtitle="Live floor monitoring">
        {can('ORG_ADMIN','PRODUCTION_MANAGER','SUPERVISOR','FLOOR_OPERATOR') && (
          <button className="btn btn-primary" onClick={() => setLogModal(true)}><Plus size={15} /> Log Production</button>
        )}
      </PageHeader>

      <div className="grid grid-4 mb-6">
        <StatCard label="Active WOs" value={floor?.activeWorkOrders ?? '—'} icon={<TrendingUp size={20} />} color="var(--accent)" />
        <StatCard label="Today Output" value={floor?.todayOutput ?? '—'} icon={<TrendingUp size={20} />} color="var(--success)" />
        <StatCard label="Defects Today" value={floor?.defectsToday ?? '—'} icon={<AlertTriangle size={20} />} color="var(--warning)" />
        <StatCard label="Machines Down" value={floor?.machinesDown ?? '—'} icon={<AlertTriangle size={20} />} color="var(--danger)" />
      </div>

      <div className="grid grid-2 mb-6">
        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">Efficiency by Line</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eff}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="line" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} unit="%" />
                <Tooltip contentStyle={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8 }} />
                <Bar dataKey="efficiency" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">Bottlenecks</span><AlertTriangle size={16} color="var(--warning)" /></div>
          {bottlenecks.length === 0 ? <p className="text-muted text-sm">No bottlenecks detected.</p> : (
            <div>
              {bottlenecks.map((b, i) => (
                <div key={i} className="flex justify-between items-center" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span className="text-sm">{b.operation || b.workCenter}</span>
                  <span className="text-sm" style={{ color:'var(--warning)' }}>{b.avgWaitMin}min avg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Production">
        <form onSubmit={submitLog}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Work Order ID</label>
              <input className="form-input" value={form.workOrderId} onChange={set('workOrderId')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Operation ID</label>
              <input className="form-input" value={form.operationId} onChange={set('operationId')} required />
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Pieces</label><input type="number" className="form-input" value={form.pieces} onChange={set('pieces')} min={1} required /></div>
              <div className="form-group"><label className="form-label">Defects</label><input type="number" className="form-input" value={form.defects} onChange={set('defects')} min={0} /></div>
            </div>
            <div className="form-group"><label className="form-label">Rework</label><input type="number" className="form-input" value={form.rework} onChange={set('rework')} min={0} /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setLogModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Log'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
