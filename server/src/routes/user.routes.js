/**
 * User routes (tenant_admin can manage their own tenant users)
 * GET    /api/users           - List users for current tenant
 * GET    /api/users/:id       - Get user by ID
 * POST   /api/users           - Create user
 * PUT    /api/users/:id       - Update user
 * DELETE /api/users/:id       - Delete user
 */

import { Router } from 'express';
import * as userCtrl from '../controllers/user.controller.js';

const router = Router();

router.get('/', userCtrl.list);
router.get('/:id', userCtrl.get);
router.post('/', userCtrl.create);
router.put('/:id', userCtrl.update);
router.delete('/:id', userCtrl.remove);

export default router;
