import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getMachines, createMachine, startDowntime, resolveDowntime, logMaintenance, maintenanceDue } from '../api/machines.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

export default function MachinesPage() {
  const { can } = useAuth();
  const [machines, setMachines] = useState([]);
  const [due, setDue] = useState([]);
  const [tab, setTab] = useState('machines');
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [downtimeModal, setDowntimeModal] = useState(null);
  const [maintModal, setMaintModal] = useState(null);
  const [form, setForm] = useState({ name:'', code:'', type:'', workCenterId:'' });
  const [dtReason, setDtReason] = useState('');
  const [maintForm, setMaintForm] = useState({ type:'PREVENTIVE', notes:'', cost:0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [m, d] = await Promise.allSettled([getMachines(), maintenanceDue()]);
    setMachines(m.value?.data?.data?.data || m.value?.data?.data || []);
    setDue(d.value?.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createMachine(form); setCreateModal(false); load(); } catch {} setSaving(false);
  };

  const submitDowntime = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await startDowntime(downtimeModal.id, { reason: dtReason }); setDowntimeModal(null); load(); } catch {} setSaving(false);
  };

  const submitMaint = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await logMaintenance(maintModal.id, maintForm); setMaintModal(null); load(); } catch {} setSaving(false);
  };

  return (
    <Layout title="Machines">
      <PageHeader title="Machines" subtitle="Equipment status and maintenance">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}><Plus size={15} /> Add Machine</button>
        )}
      </PageHeader>

      <div className="tabs">
        {['machines','maintenance-due'].map((t) => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'maintenance-due' ? `Maintenance Due (${due.length})` : 'Machines'}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          {tab === 'machines' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Name</th><th>Code</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {machines.length === 0 && <tr><td colSpan={5}><EmptyState message="No machines." /></td></tr>}
                  {machines.map((m) => (
                    <tr key={m.id}>
                      <td className="font-semibold">{m.name}</td>
                      <td>{m.code}</td>
                      <td>{m.type || '—'}</td>
                      <td><Badge status={m.status} /></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-danger btn-sm" onClick={() => setDowntimeModal(m)}>Downtime</button>
                          {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setMaintModal(m)}>Maintenance</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'maintenance-due' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Machine</th><th>Last Maintained</th><th>Next Due</th></tr></thead>
                <tbody>
                  {due.length === 0 && <tr><td colSpan={3}><EmptyState message="No maintenance due." /></td></tr>}
                  {due.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td><td>{fmt(m.lastMaintenanceAt)}</td><td style={{ color:'var(--danger)' }}>{fmt(m.nextMaintenanceAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Machine">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
              <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={set('code')} required /></div>
            </div>
            <div className="form-group"><label className="form-label">Type</label><input className="form-input" value={form.type} onChange={set('type')} /></div>
            <div className="form-group"><label className="form-label">Work Center ID</label><input className="form-input" value={form.workCenterId} onChange={set('workCenterId')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!downtimeModal} onClose={() => setDowntimeModal(null)} title={`Start Downtime — ${downtimeModal?.name}`}>
        <form onSubmit={submitDowntime}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Reason</label><textarea className="form-textarea" value={dtReason} onChange={(e) => setDtReason(e.target.value)} required /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setDowntimeModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={saving}>{saving ? 'Saving…' : 'Start Downtime'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!maintModal} onClose={() => setMaintModal(null)} title={`Log Maintenance — ${maintModal?.name}`}>
        <form onSubmit={submitMaint}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={maintForm.type} onChange={(e) => setMaintForm(p => ({ ...p, type: e.target.value }))}>
                {['PREVENTIVE','CORRECTIVE','PREDICTIVE'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={maintForm.notes} onChange={(e) => setMaintForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Cost (₹)</label><input type="number" className="form-input" value={maintForm.cost} onChange={(e) => setMaintForm(p => ({ ...p, cost: e.target.value }))} min={0} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setMaintModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Log'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
