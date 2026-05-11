export function Loader() {
  return <div className="loader-wrap"><div className="spinner" /></div>;
}

export function EmptyState({ icon, message = 'No records found.' }) {
  return (
    <div className="empty-state">
      {icon && <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>{icon}</div>}
      <p>{message}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, delta, deltaUp, icon, color = 'var(--accent)' }) {
  return (
    <div className="card stat-card">
      <div className="flex justify-between items-center">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? '—'}</div>
          {delta != null && (
            <div className={`stat-delta ${deltaUp ? 'up' : 'down'}`}>
              {deltaUp ? '▲' : '▼'} {delta}
            </div>
          )}
        </div>
        {icon && (
          <div className="stat-icon" style={{ background: `${color}20`, color }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
