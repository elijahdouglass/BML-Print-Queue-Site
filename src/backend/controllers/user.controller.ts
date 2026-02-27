// controllers/user.controller.ts

import { Request, Response } from 'express';
import userService from '../services/user.service';
import { updateUserUsageSchema } from '../schemas/validation';
import { ZodError } from 'zod';

export class UserController {
  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getUserById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
      });
    }
  }

  /**
   * Get all users
   * GET /api/users
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await userService.getAllUsers();

      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  }

  /**
   * Update user's filament usage
   * PATCH /api/users/:id/usage
   */
  async updateUserUsage(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateUserUsageSchema.parse(req.body);

      const user = await userService.updateUserUsage(id, validatedData.usage);

      res.status(200).json({
        success: true,
        data: user,
        message: 'User usage updated successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error updating user usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user usage',
      });
    }
  }

  /**
   * Add to user's filament usage (increment)
   * POST /api/users/:id/usage/add
   */
  async addUserUsage(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateUserUsageSchema.parse(req.body);

      const user = await userService.addUserUsage(id, validatedData.usage);

      res.status(200).json({
        success: true,
        data: user,
        message: `Added ${validatedData.usage}g to user's filament usage`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error adding user usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add user usage',
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/users/:id/stats
   */
  async getUserStats(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const stats = await userService.getUserStats(id);

      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user stats',
      });
    }
  }
}

export default new UserController();