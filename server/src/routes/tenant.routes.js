/**
 * Tenant routes (super_admin only)
 * GET    /api/tenants      - List all tenants
 * GET    /api/tenants/:id  - Get tenant by ID
 * POST   /api/tenants      - Create tenant
 * PUT    /api/tenants/:id  - Update tenant
 * DELETE /api/tenants/:id  - Delete tenant
 */

import { Router } from 'express';
import * as tenantCtrl from '../controllers/tenant.controller.js';
import { validate } from '../middleware/validation.js';
import { paginationQuery, createTenantSchema } from '../shared/validators.js';

const router = Router();

router.get('/', validate(paginationQuery, 'query'), tenantCtrl.list);
router.get('/:id', tenantCtrl.get);
router.post('/', validate(createTenantSchema), tenantCtrl.create);
router.put('/:id', tenantCtrl.update);
router.delete('/:id', tenantCtrl.remove);

export default router;
