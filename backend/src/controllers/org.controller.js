import prisma from '../config/db.js';

import {  ok,created} from '../utils/helpers.js';

import { AppError } from '../middleware/errorHandler.js';

import { auditLog } from '../middleware/requestLogger.js';

// GET /organizations/me
const getMyOrg = async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.orgId },
      include: {
        _count: { select: { users: true, facilities: true, employees: true, orders: true } },
      },
    });
    ok(res, org);
  } catch (err) { next(err); }
};

// PATCH /organizations/me
const updateMyOrg = async (req, res, next) => {
  try {
    const { name, address, city, state, phone, email, logoUrl, timezone, currency, gstNumber } = req.body;
    const old = await prisma.organization.findUnique({ where: { id: req.orgId } });

    const org = await prisma.organization.update({
      where: { id: req.orgId },
      data: { name, address, city, state, phone, email, logoUrl, timezone, currency, gstNumber },
    });

    await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'ORG_UPDATED', entityType: 'Organization', entityId: req.orgId, oldValues: old, newValues: org, req });
    ok(res, org, 'Organization updated');
  } catch (err) { next(err); }
};

// ─── FACILITIES ──────────────────────────────────────────────

// GET /facilities
const getFacilities = async (req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({
      where: { organizationId: req.orgId, isActive: true },
      include: {
        floors: true,
        _count: { select: { workCenters: true, employees: true } },
      },
      orderBy: { name: 'asc' },
    });
    ok(res, facilities);
  } catch (err) { next(err); }
};

// POST /facilities
const createFacility = async (req, res, next) => {
  try {
    const { name, code, address, floorAreaSqFt } = req.body;
    const facility = await prisma.facility.create({
      data: { organizationId: req.orgId, name, code, address, floorAreaSqFt },
    });
    await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'FACILITY_CREATED', entityType: 'Facility', entityId: facility.id, newValues: facility, req });
    created(res, facility);
  } catch (err) { next(err); }
};

// PATCH /facilities/:id
const updateFacility = async (req, res, next) => {
  try {
    const facility = await prisma.facility.update({
      where: { id: req.params.id },
      data: req.body,
    });
    ok(res, facility);
  } catch (err) { next(err); }
};

// POST /facilities/:id/floors
const addFloor = async (req, res, next) => {
  try {
    const { name, floorNumber, layoutJson } = req.body;
    const floor = await prisma.floor.create({
      data: { facilityId: req.params.id, name, floorNumber, layoutJson },
    });
    created(res, floor);
  } catch (err) { next(err); }
};


export {
  getMyOrg,
  updateMyOrg,
  getFacilities,
  createFacility,
  updateFacility,
  addFloor,
};