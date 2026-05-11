import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import { getEmployees, createEmployee, upsertSkill } from '../api/employees.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function EmployeesPage() {
  const { can } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [skillModal, setSkillModal] = useState(null);
  const [form, setForm] = useState({ employeeCode:'', fullName:'', department:'', role:'FLOOR_OPERATOR', smv:0 });
  const [skillForm, setSkillForm] = useState({ operationName:'', proficiencyLevel:3 });
  const [saving, setSaving] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await getEmployees({ page: p, limit: 20 });
      setEmployees(data.data?.data || []); setMeta(data.data?.meta || {});
    } catch {} setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createEmployee(form); setModal(false); load(page); } catch {} setSaving(false);
  };

  const submitSkill = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await upsertSkill(skillModal.id, skillForm); setSkillModal(null); } catch {} setSaving(false);
  };

  return (
    <Layout title="Employees">
      <PageHeader title="Employees" subtitle="Workforce and skill management">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Add Employee</button>
        )}
      </PageHeader>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {employees.length === 0 && <tr><td colSpan={5}><EmptyState message="No employees." /></td></tr>}
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.employeeCode}</td>
                    <td className="font-semibold">{emp.fullName}</td>
                    <td>{emp.department || '—'}</td>
                    <td><Badge status={emp.role} label={emp.role} /></td>
                    <td>
                      {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setSkillModal(emp)}>Skills</button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add Employee">
        <form onSubmit={submitCreate}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Employee Code</label><input className="form-input" value={form.employeeCode} onChange={set('employeeCode')} required /></div>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.fullName} onChange={set('fullName')} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Department</label><input className="form-input" value={form.department} onChange={set('department')} /></div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={set('role')}>
                  {['FLOOR_OPERATOR','SUPERVISOR','QUALITY_INSPECTOR','STORE_KEEPER','PRODUCTION_MANAGER'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">SMV</label><input type="number" className="form-input" value={form.smv} onChange={set('smv')} min={0} step={0.01} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!skillModal} onClose={() => setSkillModal(null)} title={`Add Skill — ${skillModal?.fullName}`}>
        <form onSubmit={submitSkill}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Operation Name</label><input className="form-input" value={skillForm.operationName} onChange={(e) => setSkillForm(p => ({ ...p, operationName: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Proficiency (1-5)</label><input type="number" className="form-input" value={skillForm.proficiencyLevel} onChange={(e) => setSkillForm(p => ({ ...p, proficiencyLevel: parseInt(e.target.value) }))} min={1} max={5} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setSkillModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
