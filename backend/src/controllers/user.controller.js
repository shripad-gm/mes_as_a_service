import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import env from '../config/env.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

// GET /users
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { role, search } = req.query;

    const where = {
      organizationId: req.orgId,
      ...(role ? { role } : {}),
      ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    ok(res, paginatedResponse(users, total, page, limit));
  } catch (err) { next(err); }
};

// GET /users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.orgId },
      select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    ok(res, user);
  } catch (err) { next(err); }
};

// POST /users  (invite / create user in org)
const createUser = async (req, res, next) => {
  try {
    const { email, password, fullName, phone, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'DUPLICATE');

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { organizationId: req.orgId, email, passwordHash, fullName, phone, role },
      select: { id: true, email: true, fullName: true, role: true },
    });
    created(res, user);
  } catch (err) { next(err); }
};

// PATCH /users/:id
const updateUser = async (req, res, next) => {
  try {
    const { fullName, phone, role, isActive, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, phone, role, isActive, avatarUrl },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    ok(res, user);
  } catch (err) { next(err); }
};

export { getUsers, getUser, createUser, updateUser };