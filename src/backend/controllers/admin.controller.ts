// controllers/admin.controller.ts

import { Request, Response } from 'express';
import schedulerService from '../services/scheduler.service';

export class AdminController {
  /**
   * Manually trigger weekly reset
   * POST /api/admin/reset
   * 
   * This endpoint allows administrators to manually trigger the weekly reset
   * without waiting for the scheduled time. Useful for testing or immediate cleanup.
   */
  async triggerWeeklyReset(req: Request, res: Response) {
    try {
      console.log('🔄 Manual weekly reset triggered by admin');
      
      const result = await schedulerService.performWeeklyReset();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Weekly reset completed successfully',
          data: {
            resetWaitingJobs: result.resetWaitingJobs,
            preservedUsers: result.preservedUsers,
            resetUsageForUsers: result.resetUsageForUsers,
            deletedUsers: result.deletedUsers,
            deletedJobs: result.deletedJobs,
            clearedUploads: result.clearedUploads,
          },
        });
      } else {
        res.status(207).json({
          success: false,
          message: 'Weekly reset completed with errors',
          data: {
            resetWaitingJobs: result.resetWaitingJobs,
            preservedUsers: result.preservedUsers,
            resetUsageForUsers: result.resetUsageForUsers,
            deletedUsers: result.deletedUsers,
            deletedJobs: result.deletedJobs,
            clearedUploads: result.clearedUploads,
            errors: result.errors,
          },
        });
      }
    } catch (error) {
      console.error('Error triggering weekly reset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger weekly reset',
      });
    }
  }

  /**
   * Get scheduler status
   * GET /api/admin/scheduler/status
   */
  async getSchedulerStatus(req: Request, res: Response) {
    try {
      const status = schedulerService.getStatus();

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduler status',
      });
    }
  }
}

export default new AdminController();