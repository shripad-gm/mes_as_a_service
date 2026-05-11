import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getChecks, createCheck, getDefectTypes, createDefectType, getAnalytics } from '../api/quality.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmt } from '../utils/format.js';

export default function QualityPage() {
  const { can } = useAuth();
  const [checks, setChecks] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('checks');
  const [loading, setLoading] = useState(true);
  const [checkModal, setCheckModal] = useState(false);
  const [defModal, setDefModal] = useState(false);
  const [checkForm, setCheckForm] = useState({ workOrderId:'', operationId:'', pieces:0, defects:0, defectTypeIds:[] });
  const [defForm, setDefForm] = useState({ name:'', code:'' });
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    const [c, dt, a] = await Promise.allSettled([
      getChecks({ page: p, limit: 20 }),
      getDefectTypes(),
      getAnalytics(),
    ]);
    setChecks(c.value?.data?.data?.data || []);
    setMeta(c.value?.data?.data?.meta || {});
    setDefectTypes(dt.value?.data?.data || []);
    setAnalytics(a.value?.data?.data);
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const setC = (k) => (e) => setCheckForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCheck = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createCheck(checkForm); setCheckModal(false); load(page); } catch {}
    setSaving(false);
  };

  const submitDef = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createDefectType(defForm); setDefModal(false); load(page); } catch {}
    setSaving(false);
  };

  return (
    <Layout title="Quality Control">
      <PageHeader title="Quality Control" subtitle="Inspections, defects, and analytics">
        <div className="flex gap-2">
          {can('ORG_ADMIN','PRODUCTION_MANAGER','SUPERVISOR','QUALITY_INSPECTOR') && (
            <button className="btn btn-primary" onClick={() => setCheckModal(true)}><Plus size={15} /> New Check</button>
          )}
          {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
            <button className="btn btn-secondary" onClick={() => setDefModal(true)}>+ Defect Type</button>
          )}
        </div>
      </PageHeader>

      <div className="tabs">
        {['checks','defect-types','analytics'].map((t) => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'defect-types' ? 'Defect Types' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          {tab === 'checks' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Work Order</th><th>Operation</th><th>Pieces</th><th>Defects</th><th>DHU</th><th>Date</th></tr></thead>
                <tbody>
                  {checks.length === 0 && <tr><td colSpan={6}><EmptyState message="No quality checks." /></td></tr>}
                  {checks.map((c) => (
                    <tr key={c.id}>
                      <td>{c.workOrder?.orderNumber || c.workOrderId}</td>
                      <td>{c.operation?.name || c.operationId}</td>
                      <td>{c.pieces}</td>
                      <td style={{ color: c.defects > 0 ? 'var(--danger)' : 'inherit' }}>{c.defects}</td>
                      <td>{c.dhu}%</td>
                      <td>{fmt(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'defect-types' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Name</th><th>Code</th></tr></thead>
                <tbody>
                  {defectTypes.length === 0 && <tr><td colSpan={2}><EmptyState message="No defect types." /></td></tr>}
                  {defectTypes.map((d) => (
                    <tr key={d.id}><td>{d.name}</td><td>{d.code}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="grid grid-2">
              <div className="card card-pad">
                <div className="card-header"><span className="font-semibold">DHU Trend</span></div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.dhuTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                      <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                      <Tooltip contentStyle={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8 }} />
                      <Line type="monotone" dataKey="dhu" stroke="var(--warning)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card card-pad">
                <div className="card-header"><span className="font-semibold">Top Defects</span></div>
                {(analytics?.topDefects || []).map((d, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <span className="text-sm">{d.defectType}</span>
                    <span className="text-sm" style={{ color:'var(--danger)' }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={checkModal} onClose={() => setCheckModal(false)} title="New Quality Check">
        <form onSubmit={submitCheck}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Work Order ID</label><input className="form-input" value={checkForm.workOrderId} onChange={setC('workOrderId')} required /></div>
            <div className="form-group"><label className="form-label">Operation ID</label><input className="form-input" value={checkForm.operationId} onChange={setC('operationId')} required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Pieces</label><input type="number" className="form-input" value={checkForm.pieces} onChange={setC('pieces')} min={1} required /></div>
              <div className="form-group"><label className="form-label">Defects</label><input type="number" className="form-input" value={checkForm.defects} onChange={setC('defects')} min={0} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCheckModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Submit'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={defModal} onClose={() => setDefModal(false)} title="Add Defect Type">
        <form onSubmit={submitDef}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={defForm.name} onChange={(e) => setDefForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={defForm.code} onChange={(e) => setDefForm(p => ({ ...p, code: e.target.value }))} required /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setDefModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
