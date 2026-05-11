import prisma from '../config/db.js';

const requestLogger = (req, res, next) => {
  req.startTime = Date.now();

  next();
};

// Call this inside mutating controllers
// to log to AuditLog

const auditLog = async ({
  orgId,
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  req,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,

        userId: userId || null,

        action,

        entityType,

        entityId: String(entityId),

        oldValues: oldValues || undefined,

        newValues: newValues || undefined,

        ipAddress: req?.ip,

        userAgent:
          req?.headers?.['user-agent'],
      },
    });
  } catch (e) {
    // Non-blocking — audit failures
    // should not break operations

    console.error(
      'Audit log error:',
      e.message
    );
  }
};

export { requestLogger, auditLog };