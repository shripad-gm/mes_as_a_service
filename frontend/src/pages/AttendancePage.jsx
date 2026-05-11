import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader, EmptyState, Pagination } from '../components/UI.jsx';
import { getAttendance } from '../api/attendance.js';
import { fmtDt } from '../utils/format.js';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try { const { data } = await getAttendance({ page: p, limit: 20 }); setRecords(data.data?.data || []); setMeta(data.data?.meta || {}); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <Layout title="Attendance">
      <PageHeader title="Attendance Log" subtitle="Employee check-in and check-out records" />

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr></thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan={5}><EmptyState message="No attendance records." /></td></tr>}
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.employee?.fullName || r.employeeId}</td>
                    <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td>{fmtDt(r.checkIn)}</td>
                    <td>{r.checkOut ? fmtDt(r.checkOut) : <span style={{ color:'var(--warning)' }}>Active</span>}</td>
                    <td>{r.hoursWorked != null ? `${r.hoursWorked}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}
    </Layout>
  );
}
