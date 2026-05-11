import { Router } from 'express';
import {
    getProductLines, createProductLine, updateProductLine,
    getStyleVariants, getStyleVariant, createStyleVariant, updateStyleVariant,
    getBom, upsertBomItem, deleteBomItem,
    getRoutings, createRouting, updateRouting, deleteRouting,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Product lines
router.get('/lines', getProductLines);
router.post('/lines', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createProductLine);
router.patch('/lines/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateProductLine);

// Style variants
router.get('/variants', getStyleVariants);
router.get('/variants/:id', getStyleVariant);
router.post('/variants', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createStyleVariant);
router.patch('/variants/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateStyleVariant);

// BOM
router.get('/variants/:variantId/bom', getBom);
router.post('/bom', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), upsertBomItem);
router.delete('/bom/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), deleteBomItem);

// Routing
router.get('/variants/:variantId/routing', getRoutings);
router.post('/routing', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createRouting);
router.patch('/routing/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateRouting);
router.delete('/routing/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), deleteRouting);

export default router;