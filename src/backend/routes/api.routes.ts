// routes/api.routes.ts

import { Router } from 'express';
import authRoutes from './auth.routes';
import printJobRoutes from './printJob.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);       // Authentication endpoints
router.use('/jobs', printJobRoutes);   // Print job management
router.use('/users', userRoutes);      // User management
router.use('/uploads', uploadRoutes);  // File uploads

export default router;