import prisma from '../config/db.js';

/**
 * Create a notification in DB
 * and push via Socket.IO
 */

const pushNotification = async (
  app,
  {
    userId,
    type,
    title,
    body,
    referenceId,
    referenceType,
  }
) => {
  try {
    const notification =
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          referenceId,
          referenceType,
        },
      });

    const io = app?.get('io');

    if (io) {
      io.to(`user:${userId}`).emit(
        'notification',
        notification
      );
    }

    return notification;
  } catch (e) {
    console.error(
      'pushNotification error:',
      e.message
    );
  }
};

/**
 * Push to all users of an org
 * matching certain roles
 */

const pushOrgNotification = async (
  app,
  {
    orgId,
    roles,
    type,
    title,
    body,
    referenceId,
    referenceType,
  }
) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        organizationId: orgId,

        isActive: true,

        ...(roles
          ? {
              role: {
                in: roles,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

    await Promise.all(
      users.map((u) =>
        pushNotification(app, {
          userId: u.id,
          type,
          title,
          body,
          referenceId,
          referenceType,
        })
      )
    );
  } catch (e) {
    console.error(
      'pushOrgNotification error:',
      e.message
    );
  }
};

export {
  pushNotification,
  pushOrgNotification,
};