import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getShipments, createShipment, updateShipmentStatus } from '../api/shipments.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

const SHIP_STATUSES = ['PREPARING','DISPATCHED','IN_TRANSIT','DELIVERED','RETURNED'];

export default function ShipmentsPage() {
  const { can } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [form, setForm] = useState({ orderId:'', carrier:'', trackingNumber:'', dispatchDate:'' });
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try { const { data } = await getShipments({ page: p, limit: 20 }); setShipments(data.data?.data || []); setMeta(data.data?.meta || {}); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createShipment(form); setModal(false); load(page); } catch {} setSaving(false);
  };

  const submitStatus = async () => {
    await updateShipmentStatus(statusModal.id, { status: newStatus });
    setStatusModal(null); load(page);
  };

  return (
    <Layout title="Shipments">
      <PageHeader title="Shipments" subtitle="Outbound logistics tracking">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New Shipment</button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Tracking</th><th>Carrier</th><th>Status</th><th>Dispatch Date</th><th>Actions</th></tr></thead>
              <tbody>
                {shipments.length === 0 && <tr><td colSpan={5}><EmptyState message="No shipments." /></td></tr>}
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.trackingNumber || '—'}</td>
                    <td>{s.carrier || '—'}</td>
                    <td><Badge status={s.status} /></td>
                    <td>{fmt(s.dispatchDate)}</td>
                    <td>
                      {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setStatusModal(s); setNewStatus(s.status); }}>
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            {page > 1 && <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)}>Prev</button>}
            <span className="text-sm text-muted">Page {page}</span>
            {meta.hasNext && <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Next</button>}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Shipment">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Order ID</label><input className="form-input" value={form.orderId} onChange={set('orderId')} required /></div>
            <div className="form-group"><label className="form-label">Carrier</label><input className="form-input" value={form.carrier} onChange={set('carrier')} /></div>
            <div className="form-group"><label className="form-label">Tracking Number</label><input className="form-input" value={form.trackingNumber} onChange={set('trackingNumber')} /></div>
            <div className="form-group"><label className="form-label">Dispatch Date</label><input type="date" className="form-input" value={form.dispatchDate} onChange={set('dispatchDate')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Update Shipment Status">
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {SHIP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitStatus}>Apply</button>
        </div>
      </Modal>
    </Layout>
  );
}
