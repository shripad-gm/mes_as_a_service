// Re-export everything from the canonical middleware implementation.
// Controllers import from utils/notifications.js — logic lives in middleware/notification.js.
export {
  pushNotification,
  pushOrgNotification,
} from '../middleware/notification.js';
