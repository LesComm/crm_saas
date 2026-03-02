/**
 * CRM credentials routes
 * GET    /api/credentials           - List credentials for tenant
 * GET    /api/credentials/:id       - Get credential
 * POST   /api/credentials           - Create credential (encrypts API token)
 * POST   /api/credentials/:id/test  - Test CRM connection
 * DELETE /api/credentials/:id       - Delete credential
 */

import { Router } from 'express';
import * as crmCtrl from '../controllers/crm.controller.js';
import { validate } from '../middleware/validation.js';
import { createCredentialSchema } from '../shared/validators.js';

const router = Router();

router.get('/', crmCtrl.list);
router.get('/:id', crmCtrl.get);
router.post('/', validate(createCredentialSchema), crmCtrl.create);
router.post('/:id/test', crmCtrl.testConnection);
router.delete('/:id', crmCtrl.remove);

export default router;
