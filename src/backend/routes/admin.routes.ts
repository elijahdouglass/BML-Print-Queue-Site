// routes/admin.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import adminController from '../controllers/admin.controller';

const router = Router();

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-admin-secret'];

  if (!process.env.MONITOR_PASSWORD) {
    console.error('MONITOR_PASSWORD env variable is not set!');
    return res.status(500).json({ success: false, error: 'Server misconfiguration' });
  }

  if (!secret || secret !== process.env.MONITOR_PASSWORD) {
    console.warn(`Unauthorized admin reset attempt from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
}

// POST /api/admin/reset - Manually trigger weekly reset (requires MONITOR_PASSWORD)
router.post('/reset', adminAuth, adminController.triggerWeeklyReset.bind(adminController));

// GET /api/admin/scheduler/status - Get scheduler status (unprotected)
router.get('/scheduler/status', adminController.getSchedulerStatus.bind(adminController));

export default router;