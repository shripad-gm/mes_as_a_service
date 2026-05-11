// Re-export everything from the canonical middleware implementation.
// Controllers import from utils/helpers.js — logic lives in middleware/helper.js.
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
} from '../middleware/helper.js';
