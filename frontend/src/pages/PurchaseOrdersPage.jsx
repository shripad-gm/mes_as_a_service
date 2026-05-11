import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getPurchaseOrders, createPurchaseOrder, updatePoStatus, createGrn } from '../api/purchaseOrders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

const PO_STATUSES = ['DRAFT','SENT','ACKNOWLEDGED','PARTIAL','RECEIVED','CANCELLED'];

export default function PurchaseOrdersPage() {
  const { can } = useAuth();
  const [pos, setPos] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [grnModal, setGrnModal] = useState(null);
  const [form, setForm] = useState({ supplierId:'', expectedDate:'' });
  const [grnForm, setGrnForm] = useState({ items:[] });
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try { const { data } = await getPurchaseOrders({ page: p, limit: 20 }); setPos(data.data?.data || []); setMeta(data.data?.meta || {}); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createPurchaseOrder(form); setModal(false); load(page); } catch {} setSaving(false);
  };

  const submitGrn = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createGrn(grnModal.id, grnForm); setGrnModal(null); load(page); } catch {} setSaving(false);
  };

  return (
    <Layout title="Purchase Orders">
      <PageHeader title="Purchase Orders" subtitle="Procurement management">
        {can('ORG_ADMIN','STORE_KEEPER') && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New PO</button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Status</th><th>Expected Date</th><th>Actions</th></tr></thead>
              <tbody>
                {pos.length === 0 && <tr><td colSpan={5}><EmptyState message="No purchase orders." /></td></tr>}
                {pos.map((po) => (
                  <tr key={po.id}>
                    <td className="font-semibold">{po.poNumber}</td>
                    <td>{po.supplier?.name || '—'}</td>
                    <td><Badge status={po.status} /></td>
                    <td>{fmt(po.expectedDate)}</td>
                    <td>
                      {can('ORG_ADMIN','STORE_KEEPER') && po.status !== 'RECEIVED' && (
                        <button className="btn btn-success btn-sm" onClick={() => setGrnModal(po)}>GRN</button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase Order">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Supplier ID</label><input className="form-input" value={form.supplierId} onChange={(e) => setForm(p => ({ ...p, supplierId: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Expected Date</label><input type="date" className="form-input" value={form.expectedDate} onChange={(e) => setForm(p => ({ ...p, expectedDate: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!grnModal} onClose={() => setGrnModal(null)} title={`Goods Receipt — ${grnModal?.poNumber}`}>
        <form onSubmit={submitGrn}>
          <div className="modal-body">
            <p className="text-muted text-sm mb-4">Recording receipt confirms the goods have been received for this PO.</p>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={grnForm.notes || ''} onChange={(e) => setGrnForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setGrnModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Saving…' : 'Confirm Receipt'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
