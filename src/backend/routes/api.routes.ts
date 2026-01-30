// routes/api.routes.ts

import { Router } from 'express';
import printJobRoutes from './printJob.routes';
import userRoutes from './user.routes';

const router = Router();

// Mount route modules
router.use('/jobs', printJobRoutes);
router.use('/users', userRoutes);

export default router;