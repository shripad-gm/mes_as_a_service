import { statusColor } from '../utils/format.js';

export default function Badge({ status, label }) {
  const color = statusColor(status || label);
  return <span className={`badge badge-${color}`}>{label || status}</span>;
}
