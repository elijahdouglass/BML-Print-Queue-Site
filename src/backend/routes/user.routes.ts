// routes/user.routes.ts

import { Router } from 'express';
import printJobController from '../controllers/printJob.controller';

const router = Router();

// Get all jobs for a specific user
router.get('/:userId/jobs', printJobController.getPrintJobsByUser.bind(printJobController));

export default router;