import { Request, Response } from 'express';
import printJobService from '../services/printJob.service';
import {
  createPrintJobSchema,
  updatePrintJobSchema,
  updatePrintJobStatusSchema,
} from '../schemas/validation';
import { ZodError } from 'zod';

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
   * Update print job status
   * PATCH /api/jobs/:id/status
   */
  async updatePrintJobStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updatePrintJobStatusSchema.parse(req.body);

      const printJob = await printJobService.updatePrintJobStatus(id, validatedData);

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
      // Require confirmation query parameter for safety
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