// routes/user.routes.ts

import { Router } from 'express';
import userController from '../controllers/user.controller';
import printJobController from '../controllers/printJob.controller';

const router = Router();

// User CRUD
router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));

// User statistics
router.get('/:id/stats', userController.getUserStats.bind(userController));

// User filament usage management
router.patch('/:id/usage', userController.updateUserUsage.bind(userController));
router.post('/:id/usage/add', userController.addUserUsage.bind(userController));


// Get all jobs for a specific user
router.get('/:userId/jobs', printJobController.getPrintJobsByUser.bind(printJobController));

export default router;