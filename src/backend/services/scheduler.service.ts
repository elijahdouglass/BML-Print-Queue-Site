// services/scheduler.service.ts

import * as cron from 'node-cron';
import userService from './user.service';
import printJobService from './printJob.service';
import fs from 'fs';
import path from 'path';

class SchedulerService {
  private weeklyResetJob: cron.ScheduledTask | null = null;

  /**
   * Initialize the weekly reset scheduler
   * Day and timezone are configured via RESET_DAY and RESET_TIMEZONE env variables
   */
  initialize() {
    const day = process.env.RESET_DAY || '1';       // 0=Sunday, 1=Monday, ..., 6=Saturday
    const timezone = process.env.RESET_TIMEZONE || 'America/Indiana/Indianapolis';

    this.weeklyResetJob = cron.schedule(`0 0 * * ${day}`, async () => {
      console.log('Starting weekly reset...');
      await this.performWeeklyReset();
    }, {
      timezone,
    });

    console.log(`Weekly reset scheduler initialized (runs every day ${day} at 12:00 AM, timezone: ${timezone})`);
  }

  /**
   * Perform the weekly reset operations
   */
  async performWeeklyReset(): Promise<{
    success: boolean;
    resetWaitingJobs: number;
    preservedUsers: number;
    resetUsageForUsers: number;
    deletedUsers: number;
    deletedJobs: number;
    clearedUploads: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let resetWaitingJobs = 0;
    let preservedUsers = 0;
    let resetUsageForUsers = 0;
    let deletedUsers = 0;
    let deletedJobs = 0;
    let clearedUploads = false;

    try {
      // 1. Get list of users with active jobs (WAITING, PENDING, IN_PROGRESS, ACTION_NEEDED)
      console.log('Identifying users with active jobs...');
      let userIdsWithActiveJobs: string[] = [];
      try {
        userIdsWithActiveJobs = await printJobService.getUserIdsWithActiveJobs();
        console.log(`Found ${userIdsWithActiveJobs.length} users with active jobs (will be preserved)`);
      } catch (error) {
        const errorMsg = `Failed to get users with active jobs: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      // 2. Reset WAITING jobs to PENDING
      console.log('Resetting WAITING jobs to PENDING...');
      try {
        const resetResult = await printJobService.resetWaitingJobsToPending();
        resetWaitingJobs = resetResult.count;
        console.log(`Reset ${resetWaitingJobs} waiting jobs to PENDING`);
      } catch (error) {
        const errorMsg = `Failed to reset waiting jobs: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      // 3. Reset usage to 0 for all preserved users
      console.log('Resetting usage to 0 for preserved users...');
      try {
        const resetResult = await userService.resetUsageForUsers(userIdsWithActiveJobs);
        resetUsageForUsers = resetResult.count;
        preservedUsers = userIdsWithActiveJobs.length;
        console.log(`Reset usage to 0 for ${resetUsageForUsers} preserved users`);
      } catch (error) {
        const errorMsg = `Failed to reset user usage: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      // 4. Delete users who DON'T have active jobs
      console.log('Deleting users without active jobs...');
      try {
        const userResult = await userService.deleteUsersExcept(userIdsWithActiveJobs);
        deletedUsers = userResult.count;
        console.log(`Deleted ${deletedUsers} users, preserved ${preservedUsers} users with active jobs`);
      } catch (error) {
        const errorMsg = `Failed to delete users: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      // 5. Delete completed and cancelled jobs
      console.log('Deleting completed and cancelled jobs...');
      try {
        const jobResult = await printJobService.deleteCompletedAndCancelledJobs();
        deletedJobs = jobResult.count;
        console.log(`Deleted ${deletedJobs} jobs`);
      } catch (error) {
        const errorMsg = `Failed to delete jobs: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      // 6. Clear uploads directory
      console.log('Clearing uploads directory...');
      try {
        await this.clearUploadsDirectory();
        clearedUploads = true;
        console.log('Uploads directory cleared');
      } catch (error) {
        const errorMsg = `Failed to clear uploads: ${error}`;
        console.error(`${errorMsg}`);
        errors.push(errorMsg);
      }

      const success = errors.length === 0;
      console.log(success ? 'Weekly reset completed successfully' : '⚠️ Weekly reset completed with errors');

      return {
        success,
        resetWaitingJobs,
        preservedUsers,
        resetUsageForUsers,
        deletedUsers,
        deletedJobs,
        clearedUploads,
        errors,
      };
    } catch (error) {
      console.error('Critical error during weekly reset:', error);
      errors.push(`Critical error: ${error}`);
      
      return {
        success: false,
        resetWaitingJobs,
        preservedUsers,
        resetUsageForUsers,
        deletedUsers,
        deletedJobs,
        clearedUploads,
        errors,
      };
    }
  }

  /**
   * Clear STL files from COMPLETED and CANCELLED jobs only
   */
  private async clearUploadsDirectory(): Promise<void> {
    const uploadsDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadsDir)) {
      console.log('Uploads directory does not exist, skipping...');
      return;
    }

    const activeJobs = await printJobService.getActiveJobFileUrls();
    
    const activeFilenames = new Set(
      activeJobs
        .map(url => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        })
        .filter(Boolean)
    );

    console.log(`Found ${activeFilenames.size} files in use by active jobs (PENDING, WAITING, IN_PROGRESS, FAILED)`);

    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;
    let preservedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        if (activeFilenames.has(file)) {
          preservedCount++;
          console.log(`  Preserving: ${file} (in use by active job)`);
        } else {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    console.log(`Deleted ${deletedCount} files from COMPLETED/CANCELLED jobs, preserved ${preservedCount} files from active jobs`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.weeklyResetJob) {
      this.weeklyResetJob.stop();
      console.log('Weekly reset scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.weeklyResetJob !== null,
      nextRun: this.weeklyResetJob ? 'Next Monday at 12:00 AM' : 'Not scheduled',
    };
  }
}

export default new SchedulerService();