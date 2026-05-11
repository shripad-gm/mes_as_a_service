import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import prisma from '../config/db.js';
import env from '../config/env.js';

import { ok, toSlug } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

const signAccess = (userId) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

const signRefresh = (userId) =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

// POST /auth/register  — creates org + first admin user
export const register = async (req, res, next) => {
  try {
    const { orgName, email, password, fullName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'DUPLICATE');

    const slug = toSlug(orgName) + '-' + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: orgName, slug } });
      const user = await tx.user.create({
        data: { organizationId: org.id, email, passwordHash, fullName, phone, role: 'ORG_ADMIN' },
        select: { id: true, email: true, fullName: true, role: true, organizationId: true },
      });
      return { org, user };
    });

    const accessToken = signAccess(result.user.id);
    const refreshToken = signRefresh(result.user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { userId: result.user.id, token: refreshToken, expiresAt } });

    ok(res, { accessToken, refreshToken, user: result.user, org: result.org }, 'Registered', 201);
  } catch (err) { next(err); }
};

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: { select: { id: true, name: true, slug: true, subscriptionTier: true } } },
    });
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

    const { passwordHash: _, ...safeUser } = user;
    ok(res, { accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
};

// POST /auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');

    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const accessToken = signAccess(payload.userId);

    ok(res, { accessToken });
  } catch (err) { next(err); }
};

// POST /auth/logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    ok(res, null, 'Logged out');
  } catch (err) { next(err); }
};

// GET /auth/me
export const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, fullName: true, phone: true, avatarUrl: true,
        role: true, lastLoginAt: true, createdAt: true,
        organization: { select: { id: true, name: true, slug: true, subscriptionTier: true, timezone: true } },
      },
    });
    ok(res, user);
  } catch (err) { next(err); }
};

// PATCH /auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    ok(res, null, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
};

