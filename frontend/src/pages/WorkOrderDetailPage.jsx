import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Loader, PageHeader } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getWorkOrder, updateOperation, issueMaterial } from '../api/workOrders.js';
import { getTimeline } from '../api/production.js';
import { fmt, fmtDt } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [wo, setWo] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState('operations');
  const [opModal, setOpModal] = useState(null);
  const [matModal, setMatModal] = useState(false);
  const [opForm, setOpForm] = useState({ status:'', actualQty:'', notes:'' });
  const [matForm, setMatForm] = useState({ materialId:'', qty:'', unit:'pcs' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [wRes, tRes] = await Promise.all([getWorkOrder(id), getTimeline(id).catch(() => ({ data:{ data:[] } }))]);
    setWo(wRes.data.data); setTimeline(tRes.data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const submitOp = async (e) => {
    e.preventDefault();
    await updateOperation(id, opModal.id, opForm);
    setOpModal(null); load();
  };

  const submitMat = async (e) => {
    e.preventDefault();
    await issueMaterial(id, matForm);
    setMatModal(false); load();
  };

  if (loading) return <Layout title="Work Order Detail"><Loader /></Layout>;
  if (!wo) return <Layout title="Work Order Detail"><p>Not found</p></Layout>;

  return (
    <Layout title={`WO: ${wo.orderNumber}`}>
      <PageHeader title={wo.orderNumber} subtitle={`Quantity: ${wo.quantity} | Status: ${wo.status}`}>
        {can('ORG_ADMIN','PRODUCTION_MANAGER','STORE_KEEPER') && (
          <button className="btn btn-secondary" onClick={() => setMatModal(true)}>Issue Material</button>
        )}
      </PageHeader>

      <div className="tabs">
        {['operations','timeline','materials'].map((t) => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'operations' && (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Operation</th><th>Work Center</th><th>Status</th><th>Actual Qty</th><th>Start</th><th>End</th><th></th></tr></thead>
            <tbody>
              {(wo.operations || []).map((op) => (
                <tr key={op.id}>
                  <td>{op.name}</td>
                  <td>{op.workCenter?.name || '—'}</td>
                  <td><Badge status={op.status} /></td>
                  <td>{op.actualQty ?? '—'}</td>
                  <td>{fmtDt(op.startedAt)}</td>
                  <td>{fmtDt(op.completedAt)}</td>
                  <td>
                    {can('ORG_ADMIN','PRODUCTION_MANAGER','SUPERVISOR') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setOpModal(op); setOpForm({ status: op.status, actualQty: op.actualQty || '', notes: op.notes || '' }); }}>
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="card card-pad">
          {timeline.length === 0 ? <p className="text-muted text-sm">No production logs yet.</p> : (
            <div className="timeline">
              {timeline.map((t) => (
                <div key={t.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>{t.pieces} pcs</strong> — {t.notes || 'Production logged'}
                    <div className="timeline-time">{fmtDt(t.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'materials' && (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Material</th><th>Qty Issued</th><th>Unit</th><th>Date</th></tr></thead>
            <tbody>
              {(wo.materialIssues || []).map((m) => (
                <tr key={m.id}>
                  <td>{m.material?.name || m.materialId}</td>
                  <td>{m.qty}</td><td>{m.unit}</td><td>{fmt(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Operation Modal */}
      <Modal open={!!opModal} onClose={() => setOpModal(null)} title="Update Operation">
        <form onSubmit={submitOp}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={opForm.status} onChange={(e) => setOpForm(p => ({ ...p, status: e.target.value }))}>
                {['PENDING','IN_PROGRESS','COMPLETED','ON_HOLD'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Actual Qty</label>
              <input type="number" className="form-input" value={opForm.actualQty} onChange={(e) => setOpForm(p => ({ ...p, actualQty: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={opForm.notes} onChange={(e) => setOpForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setOpModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* Issue Material Modal */}
      <Modal open={matModal} onClose={() => setMatModal(false)} title="Issue Material">
        <form onSubmit={submitMat}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Material ID</label>
              <input className="form-input" value={matForm.materialId} onChange={(e) => setMatForm(p => ({ ...p, materialId: e.target.value }))} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={matForm.qty} onChange={(e) => setMatForm(p => ({ ...p, qty: e.target.value }))} required min={0.01} step={0.01} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <input className="form-input" value={matForm.unit} onChange={(e) => setMatForm(p => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setMatModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Issue</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
