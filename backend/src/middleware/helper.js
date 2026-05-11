import env from '../config/env.js';

// ─── Pagination ──────────────────────────────────────────────
const getPagination = (query) => {
  const page = Math.max(
    1,
    parseInt(query.page || '1', 10)
  );

  const limit = Math.min(
    env.MAX_PAGE_SIZE,

    Math.max(
      1,

      parseInt(
        query.limit ||
          String(env.DEFAULT_PAGE_SIZE),
        10
      )
    )
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

const paginatedResponse = (
  data,
  total,
  page,
  limit
) => ({
  data,

  meta: {
    total,

    page,

    limit,

    totalPages: Math.ceil(total / limit),

    hasNext: page * limit < total,

    hasPrev: page > 1,
  },
});

// ─── Standard Responses ──────────────────────────────────────
const ok = (
  res,
  data,
  message = 'Success',
  statusCode = 200
) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const created = (
  res,
  data,
  message = 'Created'
) => ok(res, data, message, 201);

// ─── Slug Generator ──────────────────────────────────────────
const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ─── KPI Helpers ─────────────────────────────────────────────
const calcEfficiency = (
  smv,
  pieces,
  actualMinutes
) => {
  if (!actualMinutes || actualMinutes === 0) {
    return 0;
  }

  return (
    Math.round(
      ((smv * pieces) / actualMinutes) *
        100 *
        100
    ) / 100
  );
};

const calcDhu = (defects, pieces) => {
  if (!pieces || pieces === 0) {
    return 0;
  }

  return (
    Math.round(
      (defects / pieces) * 100 * 100
    ) / 100
  );
};

const calcOee = (
  availability,
  performance,
  quality
) =>
  Math.round(
    availability *
      performance *
      quality *
      100
  ) / 100;

// ─── Date Helpers ────────────────────────────────────────────
const startOfDay = (date = new Date()) => {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);

  d.setHours(23, 59, 59, 999);

  return d;
};

const startOfMonth = (
  date = new Date()
) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

export {
  getPagination,
  paginatedResponse,
  ok,
  created,
  toSlug,
  calcEfficiency,
  calcDhu,
  calcOee,
  startOfDay,
  endOfDay,
  startOfMonth,
};