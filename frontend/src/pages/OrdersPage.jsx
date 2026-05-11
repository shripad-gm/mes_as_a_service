import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getOrders, createOrder, updateOrderStatus } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { fmt } from '../utils/format.js';

const STATUSES = ['PENDING','CONFIRMED','IN_PRODUCTION','QC_CHECK','READY','DELIVERED','CANCELLED'];

export default function OrdersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customerId:'', orderRef:'', requiredDate:'', items:[] });
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await getOrders({ page: p, limit: 20 });
      setOrders(data.data?.data || []); setMeta(data.data?.meta || {});
    } catch {} setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createOrder(form); setModal(false); load(page); } catch {}
    setSaving(false);
  };

  return (
    <Layout title="Customer Orders">
      <PageHeader title="Customer Orders" subtitle="Track and manage customer orders">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New Order</button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Ref</th><th>Customer</th><th>Status</th><th>Required Date</th><th>Created</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={5}><EmptyState message="No orders yet." /></td></tr>}
                {orders.map((o) => (
                  <tr key={o.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="font-semibold">{o.orderRef}</td>
                    <td>{o.customer?.name || '—'}</td>
                    <td><Badge status={o.status} /></td>
                    <td>{fmt(o.requiredDate)}</td>
                    <td>{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Customer Order">
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Order Reference</label><input className="form-input" value={form.orderRef} onChange={set('orderRef')} required /></div>
            <div className="form-group"><label className="form-label">Customer ID</label><input className="form-input" value={form.customerId} onChange={set('customerId')} required /></div>
            <div className="form-group"><label className="form-label">Required Date</label><input type="date" className="form-input" value={form.requiredDate} onChange={set('requiredDate')} /></div>
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
