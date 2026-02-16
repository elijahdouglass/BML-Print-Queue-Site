// routes/admin.routes.ts

import { Router } from 'express';
import adminController from '../controllers/admin.controller';

const router = Router();

// POST /api/admin/reset - Manually trigger weekly reset
router.post('/reset', adminController.triggerWeeklyReset.bind(adminController));

// GET /api/admin/scheduler/status - Get scheduler status
router.get('/scheduler/status', adminController.getSchedulerStatus.bind(adminController));

export default router;