import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import prisma from '../config/db.js';

import { AppError } from './errorHandler.js';

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AppError(
        'No token provided',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = header.split(' ')[1];

    const payload = jwt.verify(
      token,
      env.JWT_SECRET
    );

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },

      select: {
        id: true,
        organizationId: true,
        role: true,
        isActive: true,
        fullName: true,
        email: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(
        'User not found or inactive',
        401,
        'UNAUTHORIZED'
      );
    }

    req.user = user;
    req.orgId = user.organizationId;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError(
          'Token expired',
          401,
          'TOKEN_EXPIRED'
        )
      );
    }

    if (err.name === 'JsonWebTokenError') {
      return next(
        new AppError(
          'Invalid token',
          401,
          'INVALID_TOKEN'
        )
      );
    }

    next(err);
  }
};

// Role-based access — pass allowed roles
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Insufficient permissions',
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };

// Ensure resource belongs to user's org
// (pass orgId field name in params/body)

const sameOrg =
  (paramField = 'orgId') =>
  (req, res, next) => {
    const id =
      req.params[paramField] ||
      req.body[paramField];

    if (id && id !== req.orgId) {
      return next(
        new AppError(
          'Access denied to this organization',
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };

export {
  authenticate,
  authorize,
  sameOrg,
};