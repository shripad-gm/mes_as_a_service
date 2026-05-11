import { useEffect } from 'react';
import { Trash2, CheckCheck } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, EmptyState } from '../components/UI.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { fmtDt } from '../utils/format.js';

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, remove, fetch } = useNotifications();

  useEffect(() => { fetch(); }, []);

  return (
    <Layout title="Notifications">
      <PageHeader title="Notifications" subtitle="System alerts and messages">
        <button className="btn btn-secondary" onClick={markAllRead}>
          <CheckCheck size={15} /> Mark All Read
        </button>
      </PageHeader>

      <div className="card">
        {notifications.length === 0 ? (
          <EmptyState message="You're all caught up! No notifications." />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item${!n.isRead ? ' unread' : ''}`}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              {!n.isRead && <div className="notif-dot" />}
              <div style={{ flex: 1 }}>
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-sm text-muted mt-1">{n.body}</div>
                <div className="text-xs text-muted mt-1">{fmtDt(n.createdAt)}</div>
              </div>
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove(n.id); }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
