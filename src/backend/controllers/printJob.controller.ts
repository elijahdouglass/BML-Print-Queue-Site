// controllers/printJob.controller.ts

import { Request, Response } from 'express';
import printJobService from '../services/printJob.service';
import userService from '../services/user.service';
import emailService from '../services/email.service';
import {
  createPrintJobSchema,
  updatePrintJobSchema,
  updatePrintJobStatusSchema,
} from '../schemas/validation';
import { ZodError } from 'zod';

// Usage limit constant (300 grams)
const USAGE_LIMIT = 300;

export class PrintJobController {
  /**
   * Create a new print job
   * POST /api/jobs
   */
  async createPrintJob(req: Request, res: Response) {
    try {
      const validatedData = createPrintJobSchema.parse(req.body);
      const printJob = await printJobService.createPrintJob(validatedData);

      res.status(201).json({
        success: true,
        data: printJob,
        message: 'Print job created successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error creating print job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create print job',
      });
    }
  }

  /**
   * Get all print jobs
   * GET /api/jobs
   */
  async getAllPrintJobs(req: Request, res: Response) {
    try {
      const { status, userId, sortBy, sortOrder } = req.query;

      const filters = {
        status: status as string | undefined,
        userId: userId as string | undefined,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      };

      const printJobs = await printJobService.getAllPrintJobs(filters);

      res.status(200).json({
        success: true,
        data: printJobs,
        count: printJobs.length,
      });
    } catch (error) {
      console.error('Error fetching print jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch print jobs',
      });
    }
  }

  /**
   * Get a single print job by ID
   * GET /api/jobs/:id
   */
  async getPrintJobById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const printJob = await printJobService.getPrintJobById(id);

      if (!printJob) {
        return res.status(404).json({
          success: false,
          error: 'Print job not found',
        });
      }

      res.status(200).json({
        success: true,
        data: printJob,
      });
    } catch (error) {
      console.error('Error fetching print job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch print job',
      });
    }
  }

  /**
   * Update a print job
   * PATCH /api/jobs/:id
   */
  async updatePrintJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updatePrintJobSchema.parse(req.body);

      const printJob = await printJobService.updatePrintJob(id, validatedData);

      res.status(200).json({
        success: true,
        data: printJob,
        message: 'Print job updated successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error updating print job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update print job',
      });
    }
  }

  /**
   * Update print job status with email notifications
   * PATCH /api/jobs/:id/status
   */
  async updatePrintJobStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updatePrintJobStatusSchema.parse(req.body);

      // Get the current job to check previous status and user info
      const currentJob = await printJobService.getPrintJobById(id);
      
      if (!currentJob) {
        return res.status(404).json({
          success: false,
          error: 'Print job not found',
        });
      }

      const previousStatus = currentJob.status;
      const newStatus = validatedData.status;

      // Update the job status
      const printJob = await printJobService.updatePrintJobStatus(id, validatedData);

      // Send email notifications based on status change
      if (newStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
        // Send completion email (non-blocking)
        emailService.sendJobCompletionEmail({
          userEmail: currentJob.user.email,
          userName: currentJob.user.name,
          partName: currentJob.partName,
          jobId: currentJob.id,
          completedAt: new Date(),
          material: currentJob.material,
          color: currentJob.color,
          quantity: currentJob.quantity,
        }).then((sent) => {
          if (sent) {
            console.log(`Completion email sent to ${currentJob.user.email} for job ${currentJob.id}`);
          } else {
            console.error(`Failed to send completion email to ${currentJob.user.email} for job ${currentJob.id}`);
          }
        }).catch((err) => {
          console.error(`Error sending completion email:`, err);
        });
      } else if (newStatus === 'CANCELLED' && previousStatus !== 'CANCELLED') {
        // Send cancellation email (non-blocking)
        emailService.sendJobCancelledEmail({
          userEmail: currentJob.user.email,
          userName: currentJob.user.name,
          partName: currentJob.partName,
          jobId: currentJob.id,
          completedAt: new Date(),
          material: currentJob.material,
          color: currentJob.color,
          quantity: currentJob.quantity,
        }).then((sent) => {
          if (sent) {
            console.log(`Cancellation email sent to ${currentJob.user.email} for job ${currentJob.id}`);
          } else {
            console.error(`Failed to send cancellation email to ${currentJob.user.email} for job ${currentJob.id}`);
          }
        }).catch((err) => {
          console.error(`Error sending cancellation email:`, err);
        });
      }

      res.status(200).json({
        success: true,
        data: printJob,
        message: 'Print job status updated successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error updating print job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update print job status',
      });
    }
  }

  /**
   * Start a job with usage tracking
   * POST /api/jobs/:id/start
   */
  async startJobWithUsage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { usage } = req.body;

      if (typeof usage !== 'number' || usage < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid usage value. Must be a non-negative number.',
        });
      }

      const currentJob = await printJobService.getPrintJobById(id);
      
      if (!currentJob) {
        return res.status(404).json({
          success: false,
          error: 'Print job not found',
        });
      }

      if (currentJob.status !== 'PENDING' && currentJob.status !== 'WAITING' && currentJob.status !== 'ACTION_NEEDED') {
        return res.status(400).json({
          success: false,
          error: 'Job must be PENDING, WAITING, or ACTION_NEEDED to start',
        });
      }

      // Get user's current usage
      const user = await userService.getUserById(currentJob.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const currentUsage = user.usage || 0;
      const newUsage = currentUsage + usage;

      // Check if new usage would exceed the limit
      if (newUsage > USAGE_LIMIT) {
        // Set job to WAITING status
        const waitingJob = await printJobService.updatePrintJobStatus(id, { 
          status: 'WAITING' 
        });
        
          emailService.sendJobWaitingEmail({
          userEmail: currentJob.user.email,
          userName: currentJob.user.name,
          partName: currentJob.partName,
          jobId: currentJob.id,
          currentUsage,
          estimatedJobUsage: usage,
          totalUsage: newUsage,
          usageLimit: USAGE_LIMIT,
          material: currentJob.material,
          color: currentJob.color,
        }).then((sent) => {
        if (sent) {
            console.log(`Waiting email sent to ${currentJob.user.email} for job ${currentJob.id}`);
          } else {
            console.error(`Failed to send waiting email for job ${currentJob.id}`);
          }
        }).catch((err) => {
          console.error(`Error sending waiting email:`, err);
        });

        return res.status(200).json({
          success: true,
          data: waitingJob,
          message: 'Job set to WAITING - user would exceed 300g limit',
          userUsage: currentUsage,
          estimatedUsage: usage,
          totalUsage: newUsage,
          usageLimit: USAGE_LIMIT,
        });
      }

      // Add usage to user
      await userService.addUserUsage(currentJob.userId, usage);

      // Set job to IN_PROGRESS, saving the estimated usage for potential refund later
      const startedJob = await printJobService.updatePrintJobStatus(id, { 
        status: 'IN_PROGRESS',
        estimatedUsage: usage
      });

      res.status(200).json({
        success: true,
        data: startedJob,
        message: 'Job started successfully',
      });
    } catch (error) {
      console.error('Error starting job with usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start job',
      });
    }
  }

  /**
   * Delete a single print job
   * DELETE /api/jobs/:id
   */
  async deletePrintJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await printJobService.deletePrintJob(id);

      res.status(200).json({
        success: true,
        message: 'Print job deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting print job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete print job',
      });
    }
  }

  /**
   * Delete all print jobs
   * DELETE /api/jobs
   */
  async deleteAllPrintJobs(req: Request, res: Response) {
    try {
      const { confirm } = req.query;

      if (confirm !== 'true') {
        return res.status(400).json({
          success: false,
          error: 'Please add ?confirm=true to confirm deletion of all jobs',
        });
      }

      const result = await printJobService.deleteAllPrintJobs();

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.count} print jobs`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error('Error deleting all print jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete all print jobs',
      });
    }
  }

  /**
   * Get print jobs by user
   * GET /api/users/:userId/jobs
   */
  async getPrintJobsByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const printJobs = await printJobService.getPrintJobsByUser(userId);

      res.status(200).json({
        success: true,
        data: printJobs,
        count: printJobs.length,
      });
    } catch (error) {
      console.error('Error fetching user print jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user print jobs',
      });
    }
  }

  /**
   * Get job statistics
   * GET /api/jobs/stats
   */
  async getJobStatistics(req: Request, res: Response) {
    try {
      const stats = await printJobService.getJobStatistics();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching job statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job statistics',
      });
    }
  }
}

export default new PrintJobController();