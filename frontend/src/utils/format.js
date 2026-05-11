export const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
export const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
export const fmtNum = (n, dec = 2) => n != null ? Number(n).toFixed(dec) : '—';
export const fmtCurrency = (n) => n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—';
export const statusColor = (s) => {
  const map = {
    ACTIVE:'success', COMPLETED:'success', DELIVERED:'success', RECEIVED:'success', APPROVED:'success', GOOD:'success',
    PENDING:'warning', IN_PROGRESS:'info', PROCESSING:'info', OPEN:'info', PARTIAL:'warning', RUNNING:'info',
    CANCELLED:'danger', REJECTED:'danger', FAILED:'danger', CRITICAL:'danger', STOPPED:'danger',
    DRAFT:'default', IDLE:'default', INACTIVE:'default',
  };
  return map[s?.toUpperCase()] || 'default';
};
