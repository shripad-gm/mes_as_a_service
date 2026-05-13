import { useEffect, useState } from 'react';
import { BarChart3, Factory, ShoppingCart, Boxes, TrendingUp, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout.jsx';
import { StatCard, Loader, PageHeader } from '../components/UI.jsx';
import { getKpiDashboard, getEfficiencyTrend, getDhuTrend } from '../api/kpi.js';

export default function DashboardPage() {
  const [kpi, setKpi] = useState(null);
  const [effTrend, setEffTrend] = useState([]);
  const [dhuTrend, setDhuTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKpiDashboard(), getEfficiencyTrend(), getDhuTrend()])
      .then(([k, e, d]) => {
        setKpi(k.data?.data);
        setEffTrend(Array.isArray(e.data?.data) ? e.data.data : []);
        setDhuTrend(Array.isArray(d.data?.data) ? d.data.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard"><Loader /></Layout>;

  return (
    <Layout title="Dashboard">
      <PageHeader title="Overview" subtitle="Real-time factory performance" />

      <div className="grid grid-4 mb-6">
        <StatCard label="Efficiency" value={`${kpi?.efficiency ?? '—'}%`} icon={<TrendingUp size={20} />} color="var(--accent)" />
        <StatCard label="DHU" value={kpi?.dhu ?? '—'} icon={<ShieldCheck size={20} />} color="var(--warning)" />
        <StatCard label="OEE" value={kpi?.oee != null ? `${kpi.oee}%` : '—'} icon={<Factory size={20} />} color="var(--success)" />
        <StatCard label="Open Orders" value={kpi?.openOrders ?? '—'} icon={<ShoppingCart size={20} />} color="var(--info)" />
      </div>

      <div className="grid grid-2 mb-6">
        <div className="card card-pad">
          <div className="card-header">
            <span className="font-semibold">Efficiency Trend</span>
            <BarChart3 size={16} color="var(--text-muted)" />
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={effTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8 }} />
                <Line type="monotone" dataKey="efficiency" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-header">
            <span className="font-semibold">DHU Trend</span>
            <ShieldCheck size={16} color="var(--text-muted)" />
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dhuTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8 }} />
                <Line type="monotone" dataKey="dhu" stroke="var(--warning)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card card-pad">
          <div className="card-header"><span className="font-semibold">Materials Low Stock</span><Boxes size={16} color="var(--text-muted)" /></div>
          {kpi?.lowStockMaterials?.length ? (
            <div>
              {kpi.lowStockMaterials.map((m) => (
                <div key={m.id} className="flex justify-between items-center" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span className="text-sm">{m.name}</span>
                  <span className="text-sm" style={{ color:'var(--danger)' }}>{m.stockQty} {m.unit}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted text-sm">All materials adequately stocked.</p>}
        </div>

        <div className="card card-pad" style={{ gridColumn: 'span 2' }}>
          <div className="card-header"><span className="font-semibold">Recent Activity</span></div>
          <p className="text-muted text-sm">Check Production Floor or Work Orders for live updates.</p>
        </div>
      </div>
    </Layout>
  );
}
