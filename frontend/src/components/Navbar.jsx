import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const initials = user?.fullName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="navbar">
      <span className="navbar-title">{title}</span>
      <button className="nav-btn" onClick={() => navigate('/notifications')}>
        <Bell size={16} />
        {unread > 0 && <span className="nav-dot" />}
      </button>
      <div className="user-avatar" onClick={() => navigate('/settings')} title={user?.fullName}>
        {initials}
      </div>
    </header>
  );
}
