/**
 * AI Config routes
 * POST   /api/ai-config/generate     - Generate new config from CRM credentials
 * GET    /api/ai-config               - List all config versions
 * GET    /api/ai-config/active         - Get active config
 * POST   /api/ai-config/:id/activate   - Activate a config version
 */

import { Router } from 'express';
import * as aiConfigCtrl from '../controllers/aiConfig.controller.js';

const router = Router();

router.post('/generate', aiConfigCtrl.generate);
router.get('/', aiConfigCtrl.list);
router.get('/active', aiConfigCtrl.getActive);
router.post('/:id/activate', aiConfigCtrl.activate);

export default router;
