/**
 * Auth routes
 * POST /api/auth/register  - Create tenant + admin user
 * POST /api/auth/login     - Login, get tokens
 * POST /api/auth/refresh   - Refresh access token
 * POST /api/auth/logout    - Revoke refresh tokens
 */

import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../shared/validators.js';

const router = Router();

router.post('/register', validate(registerSchema), authCtrl.register);
router.post('/login', validate(loginSchema), authCtrl.login);
router.post('/refresh', validate(refreshTokenSchema), authCtrl.refresh);
router.post('/logout', authenticate, authCtrl.logout);

export default router;
