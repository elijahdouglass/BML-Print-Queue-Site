import { Router } from 'express';
import { authenticateMonitor, verifyToken } from '../controllers/auth.controller';

const router = Router();

/**
 * POST /api/auth/monitor
 * Authenticate lab monitor and return JWT token
 * 
 * Body: { password: string }
 * Response: { success: boolean, token?: string, message: string }
 */
router.post('/monitor', authenticateMonitor);

/**
 * GET /api/auth/verify
 * Verify JWT token validity (for testing)
 * 
 * Headers: Authorization: Bearer <token>
 * Response: { success: boolean, message: string, decoded?: object }
 */
router.get('/verify', verifyToken);

export default router;