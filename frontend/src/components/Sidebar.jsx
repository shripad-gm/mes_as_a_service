import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Factory, ClipboardList, ShoppingCart,
  Package, Boxes, Truck, Users, Clock, ShieldCheck,
  Cog, BarChart3, Bell, Bot, Settings, LogOut, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

const NAV = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/kpi', icon: BarChart3, label: 'KPI Analytics' },
  ]},
  { section: 'Operations', items: [
    { to: '/production', icon: Factory, label: 'Production Floor' },
    { to: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { to: '/orders', icon: ShoppingCart, label: 'Customer Orders' },
  ]},
  { section: 'Inventory', items: [
    { to: '/materials', icon: Boxes, label: 'Materials' },
    { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    { to: '/purchase-orders', icon: Package, label: 'Purchase Orders' },
  ]},
  { section: 'Products', items: [
    { to: '/products', icon: Package, label: 'Products & BOM' },
  ]},
  { section: 'Quality & Machines', items: [
    { to: '/quality', icon: ShieldCheck, label: 'Quality' },
    { to: '/machines', icon: Cog, label: 'Machines' },
  ]},
  { section: 'People', items: [
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
  ]},
  { section: 'Logistics & AI', items: [
    { to: '/shipments', icon: Truck, label: 'Shipments' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/ai', icon: Bot, label: 'AI Assistant' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">MES Platform</div>
          <div className="sidebar-logo-sub">{user?.organization?.name || 'Loading…'}</div>
        </div>
      </div>

      <nav style={{ flex: 1, paddingBottom: 12 }}>
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section">{group.section}</div>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {to === '/notifications' && unread > 0 && (
                  <span className="sidebar-badge">{unread}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <Settings size={16} /><span>Settings</span>
        </NavLink>
        <button onClick={handleLogout} className="sidebar-item w-full" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
          <LogOut size={16} /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
