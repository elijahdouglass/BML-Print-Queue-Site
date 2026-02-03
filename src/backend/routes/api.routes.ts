// routes/api.routes.ts

import { Router } from 'express';
import printJobRoutes from './printJob.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// Mount route modules
router.use('/jobs', printJobRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);

export default router;