import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Target, Package } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import Layout from '../components/Layout.jsx';
import { PageHeader, StatCard, Loader } from '../components/UI.jsx';
import { getKpiDashboard, getEfficiencyTrend, getDhuTrend, getOee, getOrderFulfillment, getSnapshots, saveSnapshot } from '../api/kpi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

const TT_STYLE = { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8 };

export default function KpiPage() {
  const { can } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [eff, setEff] = useState([]);
  const [dhu, setDhu] = useState([]);
  const [oee, setOee] = useState([]);
  const [fulfillment, setFulfillment] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getKpiDashboard(), getEfficiencyTrend(), getDhuTrend(),
      getOee(), getOrderFulfillment(), getSnapshots(),
    ]);
    setKpi(results[0].value?.data?.data);
    setEff(Array.isArray(results[1].value?.data?.data) ? results[1].value.data.data : []);
    setDhu(Array.isArray(results[2].value?.data?.data) ? results[2].value.data.data : []);
    const oeeRes = results[3].value?.data?.data;
    setOee(oeeRes ? [oeeRes] : []);
    setFulfillment(results[4].value?.data?.data);
    setSnapshots(results[5].value?.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const takeSnapshot = async () => {
    setSaving(true);
    try { await saveSnapshot({}); load(); } catch {}
    setSaving(false);
  };

  if (loading) return <Layout title="KPI Analytics"><Loader /></Layout>;

  return (
    <Layout title="KPI Analytics">
      <PageHeader title="KPI Analytics" subtitle="Factory-wide performance metrics">
        {can('ORG_ADMIN','PRODUCTION_MANAGER') && (
          <button className="btn btn-secondary" onClick={takeSnapshot} disabled={saving}>
            {saving ? 'Saving…' : '📸 Snapshot'}
          </button>
        )}
      </PageHeader>

      <div className="grid grid-4 mb-6">
        <StatCard label="Efficiency" value={`${kpi?.efficiency ?? '—'}%`} icon={<TrendingUp size={20}/>} color="var(--accent)" />
        <StatCard label="DHU" value={kpi?.dhu ?? '—'} icon={<Target size={20}/>} color="var(--warning)" />
        <StatCard label="OEE" value={kpi?.oee != null ? `${kpi.oee}%` : '—'} icon={<BarChart3 size={20}/>} color="var(--success)" />
        <StatCard label="Order Fulfillment" value={fulfillment?.rate != null ? `${fulfillment.rate}%` : '—'} icon={<Package size={20}/>} color="var(--info)" />
      </div>

      <div className="grid grid-2 mb-6">
        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">Efficiency Trend</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eff}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} unit="%" />
                <Tooltip contentStyle={TT_STYLE} />
                <Line type="monotone" dataKey="efficiency" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">DHU Trend</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dhu}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                <Tooltip contentStyle={TT_STYLE} />
                <Line type="monotone" dataKey="dhu" stroke="var(--warning)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">OEE Trend</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oee}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} unit="%" />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="oee" fill="var(--success)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">Recent Snapshots</span></div>
          {snapshots.length === 0 ? <p className="text-muted text-sm">No snapshots yet.</p> : (
            <div className="table-wrap" style={{ maxHeight: 240, overflowY:'auto' }}>
              <table>
                <thead><tr><th>Date</th><th>Efficiency</th><th>DHU</th><th>OEE</th></tr></thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td>{fmt(s.createdAt)}</td>
                      <td>{s.efficiency}%</td>
                      <td>{s.dhu}</td>
                      <td>{s.oee}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
