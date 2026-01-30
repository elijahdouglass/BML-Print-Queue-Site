// routes/printJob.routes.ts

import { Router } from 'express';
import printJobController from '../controllers/printJob.controller';

const router = Router();

// Statistics endpoint (must be before /:id to avoid route conflict)
router.get('/stats', printJobController.getJobStatistics.bind(printJobController));

// CRUD operations
router.post('/', printJobController.createPrintJob.bind(printJobController));
router.get('/', printJobController.getAllPrintJobs.bind(printJobController));
router.get('/:id', printJobController.getPrintJobById.bind(printJobController));
router.patch('/:id', printJobController.updatePrintJob.bind(printJobController));
router.patch('/:id/status', printJobController.updatePrintJobStatus.bind(printJobController));
router.delete('/:id', printJobController.deletePrintJob.bind(printJobController));

// Dangerous operation - delete all jobs (requires confirmation)
router.delete('/', printJobController.deleteAllPrintJobs.bind(printJobController));

export default router;