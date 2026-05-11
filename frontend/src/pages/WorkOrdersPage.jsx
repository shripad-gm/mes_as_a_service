import { useEffect, useState } from 'react';
import { Plus, Play } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getWorkOrders, createWorkOrder, releaseWorkOrder } from '../api/workOrders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { fmt } from '../utils/format.js';

const EMPTY_FORM = { orderNumber:'', styleVariantId:'', quantity:1, plannedStart:'', plannedEnd:'' };

export default function WorkOrdersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [wos, setWos] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await getWorkOrders({ page: p, limit: 20 });
      setWos(data.data?.data || []);
      setMeta(data.data?.meta || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createWorkOrder(form);
      setModal(false); setForm(EMPTY_FORM); load(page);
    } catch {}
    setSaving(false);
  };

  const release = async (id, e) => {
    e.stopPropagation();
    await releaseWorkOrder(id);
    load(page);
  };

  return (
    <Layout title="Work Orders">
      <PageHeader title="Work Orders" subtitle="Manage production work orders">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button id="wo-create-btn" className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={15} /> New Work Order
          </button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr><th>WO Number</th><th>Status</th><th>Qty</th><th>Planned Start</th><th>Planned End</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {wos.length === 0 && (
                  <tr><td colSpan={6}><EmptyState message="No work orders found." /></td></tr>
                )}
                {wos.map((wo) => (
                  <tr key={wo.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/work-orders/${wo.id}`)}>
                    <td className="font-semibold">{wo.orderNumber}</td>
                    <td><Badge status={wo.status} /></td>
                    <td>{wo.quantity}</td>
                    <td>{fmt(wo.plannedStart)}</td>
                    <td>{fmt(wo.plannedEnd)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {wo.status === 'DRAFT' && can('ORG_ADMIN','PRODUCTION_MANAGER','SUPERVISOR') && (
                        <button className="btn btn-success btn-sm" onClick={(e) => release(wo.id, e)}>
                          <Play size={12} /> Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Work Order">
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Order Number</label>
              <input className="form-input" value={form.orderNumber} onChange={set('orderNumber')} required placeholder="WO-2024-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Style Variant ID</label>
              <input className="form-input" value={form.styleVariantId} onChange={set('styleVariantId')} required placeholder="variant UUID" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={form.quantity} onChange={set('quantity')} min={1} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Planned Start</label>
                <input type="date" className="form-input" value={form.plannedStart} onChange={set('plannedStart')} />
              </div>
              <div className="form-group">
                <label className="form-label">Planned End</label>
                <input type="date" className="form-input" value={form.plannedEnd} onChange={set('plannedEnd')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
