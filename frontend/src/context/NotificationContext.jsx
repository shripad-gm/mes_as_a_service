import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext.jsx';
import * as notifApi from '../api/notifications.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useSocket();
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.filter((n) => !n.isRead).length;

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await notifApi.getNotifications({ limit: 50 });
    setNotifications(data.data?.data || []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    const handler = (notif) => setNotifications((prev) => [notif, ...prev]);
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socketRef?.current]);

  const markRead = async (id) => {
    await notifApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await notifApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const remove = async (id) => {
    await notifApi.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, markAllRead, remove, fetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
