import { useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getMaterials, createMaterial, stockIn, adjustStock, stockSummary } from '../api/materials.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtNum } from '../utils/format.js';

const EMPTY = { name:'', code:'', unit:'pcs', category:'', reorderPoint:0, stockQty:0 };

export default function MaterialsPage() {
  const { can } = useAuth();
  const [mats, setMats] = useState([]);
  const [summary, setSummary] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [stockQty, setStockQty] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (p = 1, q = search) => {
    setLoading(true);
    const [m, s] = await Promise.allSettled([
      getMaterials({ page: p, limit: 20, search: q }),
      stockSummary(),
    ]);
    setMats(m.value?.data?.data?.data || []);
    setMeta(m.value?.data?.data?.meta || {});
    setSummary(s.value?.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); load(1, e.target.value); };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createMaterial(form); setCreateModal(false); setForm(EMPTY); load(page); } catch {}
    setSaving(false);
  };

  const submitStock = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await stockIn(stockModal.id, { qty: parseFloat(stockQty) }); setStockModal(null); load(page); } catch {}
    setSaving(false);
  };

  const submitAdjust = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await adjustStock(adjustModal.id, { qty: parseFloat(adjQty), reason: adjReason }); setAdjustModal(null); load(page); } catch {}
    setSaving(false);
  };

  return (
    <Layout title="Materials">
      <PageHeader title="Materials & Inventory" subtitle="Track stock levels and movements">
        {can('ORG_ADMIN','PRODUCTION_MANAGER','STORE_KEEPER') && (
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}><Plus size={15} /> Add Material</button>
        )}
      </PageHeader>

      {summary.filter(m => m.stockQty <= m.reorderPoint).length > 0 && (
        <div className="alert alert-error flex items-center gap-2 mb-4">
          <AlertTriangle size={15} />
          {summary.filter(m => m.stockQty <= m.reorderPoint).length} material(s) below reorder point.
        </div>
      )}

      <div className="filter-bar mb-4">
        <input className="form-input" placeholder="Search materials…" value={search} onChange={handleSearch} style={{ maxWidth:260 }} />
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Stock Qty</th><th>Unit</th><th>Reorder Pt</th><th>Actions</th></tr></thead>
              <tbody>
                {mats.length === 0 && <tr><td colSpan={7}><EmptyState message="No materials found." /></td></tr>}
                {mats.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold">{m.name}</td>
                    <td>{m.code}</td>
                    <td>{m.category || '—'}</td>
                    <td style={{ color: m.stockQty <= m.reorderPoint ? 'var(--danger)' : 'inherit' }}>{fmtNum(m.stockQty)}</td>
                    <td>{m.unit}</td>
                    <td>{fmtNum(m.reorderPoint)}</td>
                    <td>
                      <div className="flex gap-2">
                        {can('ORG_ADMIN','PRODUCTION_MANAGER','STORE_KEEPER') && (
                          <button className="btn btn-success btn-sm" onClick={() => setStockModal(m)}>Stock In</button>
                        )}
                        {can('ORG_ADMIN','STORE_KEEPER') && (
                          <button className="btn btn-secondary btn-sm" onClick={() => setAdjustModal(m)}>Adjust</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Material">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
              <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={set('code')} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit} onChange={set('unit')} /></div>
              <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={set('category')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Initial Stock</label><input type="number" className="form-input" value={form.stockQty} onChange={set('stockQty')} min={0} step={0.01} /></div>
              <div className="form-group"><label className="form-label">Reorder Point</label><input type="number" className="form-input" value={form.reorderPoint} onChange={set('reorderPoint')} min={0} step={0.01} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Stock In Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Stock In — ${stockModal?.name}`}>
        <form onSubmit={submitStock}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Quantity ({stockModal?.unit})</label><input type="number" className="form-input" value={stockQty} onChange={(e) => setStockQty(e.target.value)} min={0.01} step={0.01} required /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setStockModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</button>
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Stock — ${adjustModal?.name}`}>
        <form onSubmit={submitAdjust}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">New Qty ({adjustModal?.unit})</label><input type="number" className="form-input" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} step={0.01} required /></div>
            <div className="form-group"><label className="form-label">Reason</label><input className="form-input" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} required /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Adjust'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
