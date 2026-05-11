import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getSuppliers, createSupplier, linkMaterial } from '../api/suppliers.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SuppliersPage() {
  const { can } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [linkModal, setLinkModal] = useState(null);
  const [form, setForm] = useState({ name:'', code:'', email:'', phone:'', country:'' });
  const [linkForm, setLinkForm] = useState({ materialId:'', unitPrice:0, leadDays:0 });
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try { const { data } = await getSuppliers({ page: p, limit: 20 }); setSuppliers(data.data?.data || []); setMeta(data.data?.meta || {}); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createSupplier(form); setModal(false); load(page); } catch {} setSaving(false);
  };

  const submitLink = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await linkMaterial(linkModal.id, linkForm); setLinkModal(null); } catch {} setSaving(false);
  };

  return (
    <Layout title="Suppliers">
      <PageHeader title="Suppliers" subtitle="Vendor management">
        {can('ORG_ADMIN','PRODUCTION_MANAGER','STORE_KEEPER') && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Add Supplier</button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Email</th><th>Country</th><th>Actions</th></tr></thead>
              <tbody>
                {suppliers.length === 0 && <tr><td colSpan={5}><EmptyState message="No suppliers." /></td></tr>}
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.code}</td><td>{s.email || '—'}</td><td>{s.country || '—'}</td>
                    <td>
                      {can('ORG_ADMIN','STORE_KEEPER') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setLinkModal(s)}>Link Material</button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add Supplier">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
              <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={set('code')} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={set('email')} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={set('phone')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={set('country')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Link Material — ${linkModal?.name}`}>
        <form onSubmit={submitLink}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Material ID</label><input className="form-input" value={linkForm.materialId} onChange={(e) => setLinkForm(p => ({ ...p, materialId: e.target.value }))} required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Unit Price (₹)</label><input type="number" className="form-input" value={linkForm.unitPrice} onChange={(e) => setLinkForm(p => ({ ...p, unitPrice: e.target.value }))} min={0} step={0.01} /></div>
              <div className="form-group"><label className="form-label">Lead Days</label><input type="number" className="form-input" value={linkForm.leadDays} onChange={(e) => setLinkForm(p => ({ ...p, leadDays: e.target.value }))} min={0} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setLinkModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Linking…' : 'Link'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
