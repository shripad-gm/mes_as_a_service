import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Loader, PageHeader } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getOrder, updateOrderStatus, assignOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

const STATUSES = ['PENDING','CONFIRMED','IN_PRODUCTION','QC_CHECK','READY','DELIVERED','CANCELLED'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await getOrder(id);
    setOrder(data.data); setNewStatus(data.data?.status || '');
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const applyStatus = async () => {
    await updateOrderStatus(id, { status: newStatus });
    setStatusModal(false); load();
  };

  if (loading) return <Layout title="Order Detail"><Loader /></Layout>;
  if (!order) return <Layout title="Order Detail"><p className="text-muted">Not found.</p></Layout>;

  return (
    <Layout title={`Order: ${order.orderRef}`}>
      <PageHeader title={order.orderRef} subtitle={`Customer: ${order.customer?.name || '—'}`}>
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-secondary" onClick={() => setStatusModal(true)}>Change Status</button>
        )}
      </PageHeader>

      <div className="grid grid-3 mb-6">
        <div className="card card-pad">
          <p className="text-muted text-sm mb-4">Status</p>
          <Badge status={order.status} />
        </div>
        <div className="card card-pad">
          <p className="text-muted text-sm mb-4">Required Date</p>
          <p className="font-semibold">{fmt(order.requiredDate)}</p>
        </div>
        <div className="card card-pad">
          <p className="text-muted text-sm mb-4">Created</p>
          <p className="font-semibold">{fmt(order.createdAt)}</p>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="font-semibold mb-4">Order Items</h3>
        {(order.items || []).length === 0 ? <p className="text-muted text-sm">No items.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Style</th><th>Qty Ordered</th><th>Qty Delivered</th></tr></thead>
              <tbody>
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.styleVariant?.name || item.styleVariantId}</td>
                    <td>{item.qtyOrdered}</td>
                    <td>{item.qtyDelivered ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change Order Status">
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">New Status</label>
            <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={applyStatus}>Apply</button>
        </div>
      </Modal>
    </Layout>
  );
}
