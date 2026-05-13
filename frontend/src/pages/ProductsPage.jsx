import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState } from '../components/UI.jsx';
import Modal from '../components/Modal.jsx';
import { getProductLines, createProductLine, getStyleVariants, createStyleVariant, getBom, upsertBomItem, deleteBomItem, getRoutings, createRouting, deleteRouting } from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProductsPage() {
  const { can } = useAuth();
  const [lines, setLines] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [bom, setBom] = useState([]);
  const [routings, setRoutings] = useState([]);
  const [tab, setTab] = useState('lines');
  const [loading, setLoading] = useState(true);
  const [lineModal, setLineModal] = useState(false);
  const [variantModal, setVariantModal] = useState(false);
  const [bomModal, setBomModal] = useState(false);
  const [routingModal, setRoutingModal] = useState(false);
  const [lineForm, setLineForm] = useState({ name:'', category:'' });
  const [variantForm, setVariantForm] = useState({ name:'', sku:'', productLineId:'' });
  const [bomForm, setBomForm] = useState({ variantId:'', materialId:'', qty:1, unit:'pcs' });
  const [routingForm, setRoutingForm] = useState({ variantId:'', stepNo:1, operationName:'', smv:0, workCenterId:'' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [l, v] = await Promise.allSettled([getProductLines(), getStyleVariants()]);
    setLines(Array.isArray(l.value?.data?.data) ? l.value.data.data : []);
    const vData = v.value?.data?.data?.data || v.value?.data?.data;
    setVariants(Array.isArray(vData) ? vData : []);
    setLoading(false);
  };

  const loadVariantDetail = async (variant) => {
    setSelectedVariant(variant);
    const [b, r] = await Promise.allSettled([getBom(variant.id), getRoutings(variant.id)]);
    setBom(Array.isArray(b.value?.data?.data) ? b.value.data.data : []);
    setRoutings(Array.isArray(r.value?.data?.data) ? r.value.data.data : []);
    setTab('bom');
  };

  useEffect(() => { load(); }, []);

  const submitLine = async (e) => { e.preventDefault(); setSaving(true); try { await createProductLine(lineForm); setLineModal(false); load(); } catch {} setSaving(false); };
  const submitVariant = async (e) => { e.preventDefault(); setSaving(true); try { await createStyleVariant(variantForm); setVariantModal(false); load(); } catch {} setSaving(false); };
  const submitBom = async (e) => { e.preventDefault(); setSaving(true); try { await upsertBomItem({ ...bomForm, variantId: selectedVariant?.id }); setBomModal(false); loadVariantDetail(selectedVariant); } catch {} setSaving(false); };
  const submitRouting = async (e) => { e.preventDefault(); setSaving(true); try { await createRouting({ ...routingForm, variantId: selectedVariant?.id }); setRoutingModal(false); loadVariantDetail(selectedVariant); } catch {} setSaving(false); };

  return (
    <Layout title="Products">
      <PageHeader title="Products & BOM" subtitle="Product lines, variants, BOM, and routings">
        <div className="flex gap-2">
          {can('ORG_ADMIN','PRODUCTION_MANAGER') && tab === 'lines' && <button className="btn btn-primary" onClick={() => setLineModal(true)}><Plus size={15} /> New Line</button>}
          {can('ORG_ADMIN','PRODUCTION_MANAGER') && tab === 'variants' && <button className="btn btn-primary" onClick={() => setVariantModal(true)}><Plus size={15} /> New Variant</button>}
          {can('ORG_ADMIN','PRODUCTION_MANAGER') && tab === 'bom' && selectedVariant && <button className="btn btn-secondary" onClick={() => setBomModal(true)}><Plus size={15} /> Add BOM Item</button>}
          {can('ORG_ADMIN','PRODUCTION_MANAGER') && tab === 'routing' && selectedVariant && <button className="btn btn-secondary" onClick={() => setRoutingModal(true)}><Plus size={15} /> Add Step</button>}
        </div>
      </PageHeader>

      <div className="tabs">
        {['lines','variants', ...(selectedVariant ? ['bom','routing'] : [])].map((t) => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'bom' ? `BOM — ${selectedVariant?.name}` : t === 'routing' ? 'Routing' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          {tab === 'lines' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Name</th><th>Category</th></tr></thead>
                <tbody>
                  {lines.length === 0 && <tr><td colSpan={2}><EmptyState message="No product lines." /></td></tr>}
                  {lines.map((l) => <tr key={l.id}><td className="font-semibold">{l.name}</td><td>{l.category || '—'}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'variants' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Name</th><th>SKU</th><th>Product Line</th><th></th></tr></thead>
                <tbody>
                  {variants.length === 0 && <tr><td colSpan={4}><EmptyState message="No variants." /></td></tr>}
                  {variants.map((v) => (
                    <tr key={v.id}>
                      <td className="font-semibold">{v.name}</td>
                      <td>{v.sku}</td>
                      <td>{v.productLine?.name || '—'}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => loadVariantDetail(v)}>BOM & Routing</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'bom' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th></th></tr></thead>
                <tbody>
                  {bom.length === 0 && <tr><td colSpan={4}><EmptyState message="No BOM items." /></td></tr>}
                  {bom.map((b) => (
                    <tr key={b.id}>
                      <td>{b.material?.name || b.materialId}</td>
                      <td>{b.qty}</td><td>{b.unit}</td>
                      <td>
                        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
                          <button className="btn-icon" onClick={async () => { await deleteBomItem(b.id); loadVariantDetail(selectedVariant); }}><Trash2 size={13} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'routing' && (
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Step</th><th>Operation</th><th>SMV</th><th>Work Center</th><th></th></tr></thead>
                <tbody>
                  {routings.length === 0 && <tr><td colSpan={5}><EmptyState message="No routing steps." /></td></tr>}
                  {routings.map((r) => (
                    <tr key={r.id}>
                      <td>{r.stepNo}</td><td>{r.operationName}</td><td>{r.smv}</td><td>{r.workCenter?.name || '—'}</td>
                      <td>
                        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
                          <button className="btn-icon" onClick={async () => { await deleteRouting(r.id); loadVariantDetail(selectedVariant); }}><Trash2 size={13} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal open={lineModal} onClose={() => setLineModal(false)} title="New Product Line">
        <form onSubmit={submitLine}><div className="modal-body">
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={lineForm.name} onChange={(e) => setLineForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={lineForm.category} onChange={(e) => setLineForm(p => ({ ...p, category: e.target.value }))} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setLineModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Create'}</button></div></form>
      </Modal>

      <Modal open={variantModal} onClose={() => setVariantModal(false)} title="New Style Variant">
        <form onSubmit={submitVariant}><div className="modal-body">
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={variantForm.name} onChange={(e) => setVariantForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={variantForm.sku} onChange={(e) => setVariantForm(p => ({ ...p, sku: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Product Line ID</label><input className="form-input" value={variantForm.productLineId} onChange={(e) => setVariantForm(p => ({ ...p, productLineId: e.target.value }))} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setVariantModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Create'}</button></div></form>
      </Modal>

      <Modal open={bomModal} onClose={() => setBomModal(false)} title="Add BOM Item">
        <form onSubmit={submitBom}><div className="modal-body">
          <div className="form-group"><label className="form-label">Material ID</label><input className="form-input" value={bomForm.materialId} onChange={(e) => setBomForm(p => ({ ...p, materialId: e.target.value }))} required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Qty</label><input type="number" className="form-input" value={bomForm.qty} onChange={(e) => setBomForm(p => ({ ...p, qty: e.target.value }))} min={0.001} step={0.001} required /></div>
            <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={bomForm.unit} onChange={(e) => setBomForm(p => ({ ...p, unit: e.target.value }))} /></div>
          </div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setBomModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Add'}</button></div></form>
      </Modal>

      <Modal open={routingModal} onClose={() => setRoutingModal(false)} title="Add Routing Step">
        <form onSubmit={submitRouting}><div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Step No.</label><input type="number" className="form-input" value={routingForm.stepNo} onChange={(e) => setRoutingForm(p => ({ ...p, stepNo: parseInt(e.target.value) }))} min={1} required /></div>
            <div className="form-group"><label className="form-label">SMV (min)</label><input type="number" className="form-input" value={routingForm.smv} onChange={(e) => setRoutingForm(p => ({ ...p, smv: e.target.value }))} min={0} step={0.01} /></div>
          </div>
          <div className="form-group"><label className="form-label">Operation Name</label><input className="form-input" value={routingForm.operationName} onChange={(e) => setRoutingForm(p => ({ ...p, operationName: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Work Center ID</label><input className="form-input" value={routingForm.workCenterId} onChange={(e) => setRoutingForm(p => ({ ...p, workCenterId: e.target.value }))} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setRoutingModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Add'}</button></div></form>
      </Modal>
    </Layout>
  );
}
