import prisma from '../config/db.js';
import { ok, getPagination, paginatedResponse } from '../utils/helpers.js';

// GET /notifications  — user's own notifications
export const getNotifications = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { isRead, type } = req.query;

        const where = {
            userId: req.user.id,
            ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
            ...(type ? { type } : {}),
        };

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
        ]);

        ok(res, { ...paginatedResponse(notifications, total, page, limit), unreadCount });
    } catch (err) { next(err); }
};

// PATCH /notifications/:id/read
export const markRead = async (req, res, next) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id, userId: req.user.id },
            data: { isRead: true, readAt: new Date() },
        });
        ok(res, null, 'Marked as read');
    } catch (err) { next(err); }
};

// PATCH /notifications/read-all
export const markAllRead = async (req, res, next) => {
    try {
        const { count } = await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        ok(res, { updated: count }, `${count} notifications marked as read`);
    } catch (err) { next(err); }
};

// DELETE /notifications/:id
export const deleteNotification = async (req, res, next) => {
    try {
        await prisma.notification.delete({ where: { id: req.params.id, userId: req.user.id } });
        ok(res, null, 'Notification deleted');
    } catch (err) { next(err); }
};