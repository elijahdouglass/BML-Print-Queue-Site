// routes/printJob.routes.ts

import { Router } from 'express';
import printJobController from '../controllers/printJob.controller';

const router = Router();

// Statistics endpoint (must be before /:id routes)
router.get('/stats', printJobController.getJobStatistics.bind(printJobController));

// CRUD operations
router.post('/', printJobController.createPrintJob.bind(printJobController));
router.get('/', printJobController.getAllPrintJobs.bind(printJobController));
router.get('/:id', printJobController.getPrintJobById.bind(printJobController));
router.patch('/:id', printJobController.updatePrintJob.bind(printJobController));

// Job status management
router.patch('/:id/status', printJobController.updatePrintJobStatus.bind(printJobController));
router.post('/:id/start', printJobController.startJobWithUsage.bind(printJobController)); // New endpoint

// Delete operations
router.delete('/:id', printJobController.deletePrintJob.bind(printJobController));
router.delete('/', printJobController.deleteAllPrintJobs.bind(printJobController));

export default router;