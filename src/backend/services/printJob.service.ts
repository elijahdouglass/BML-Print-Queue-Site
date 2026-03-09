import prisma from '../lib/prisma';
import { CreatePrintJobInput, UpdatePrintJobInput, UpdatePrintJobStatusInput } from '../schemas/validation';
import { Prisma } from '@prisma/client';

export class PrintJobService {
  /**
   * Create a new print job
   */
  async createPrintJob(data: CreatePrintJobInput) {
    // First, ensure the user exists or create them
    const user = await prisma.user.upsert({
      where: { email: data.userEmail },
      update: {
        name: data.userName,
        discord: data.userDiscord,
      },
      create: {
        name: data.userName,
        email: data.userEmail,
        discord: data.userDiscord,
      },
    });

    // Create the print job
    const printJob = await prisma.printJob.create({
      data: {
        userId: user.id,
        partName: data.partName,
        quantity: data.quantity,
        color: data.color,
        material: data.material,
        userSuppliedMaterial: data.userSuppliedMaterial,
        specialInstructions: data.specialInstructions,
        pickupLocation: data.pickupLocation,
        stlUrl: data.stlUrl,
      },
      include: {
        user: true,
      },
    });

    return printJob;
  }

  /**
   * Get all print jobs with optional filtering
   */
  async getAllPrintJobs(filters?: {
    status?: string;
    userId?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.PrintJobWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const orderBy: Prisma.PrintJobOrderByWithRelationInput = {
      [filters?.sortBy || 'createdAt']: filters?.sortOrder || 'desc',
    };

    const printJobs = await prisma.printJob.findMany({
      where,
      orderBy,
      include: {
        user: true,
      },
    });

    return printJobs;
  }

  /**
   * Get a single print job by ID
   */
  async getPrintJobById(id: string) {
    const printJob = await prisma.printJob.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    return printJob;
  }

  /**
   * Update a print job
   */
  async updatePrintJob(id: string, data: UpdatePrintJobInput) {
    const printJob = await prisma.printJob.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: {
        user: true,
      },
    });

    return printJob;
  }

  /**
   * Update print job status only
   */
  async updatePrintJobStatus(id: string, data: UpdatePrintJobStatusInput & { estimatedUsage?: number }) {
  const currentJob = await prisma.printJob.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!currentJob) throw new Error('Job not found');

  // Refund usage when cancelling an in-progress job
  if (data.status === 'CANCELLED' && (currentJob.status === 'IN_PROGRESS' || currentJob.status === 'ACTION_NEEDED') && currentJob.estimatedUsage) {
    const refundAmount = Math.min(currentJob.estimatedUsage, currentJob.user.usage);

    const [printJob] = await prisma.$transaction([
      prisma.printJob.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { user: true },
      }),
      prisma.user.update({
        where: { id: currentJob.userId },
        data: { usage: { decrement: refundAmount } },
      }),
    ]);

    return printJob;
  }

  // Normal path
  return prisma.printJob.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      ...(data.estimatedUsage !== undefined ? { estimatedUsage: data.estimatedUsage } : {}),
    },
    include: { user: true },
  });
}

  /**
   * Delete a single print job
   */
  async deletePrintJob(id: string) {
    const printJob = await prisma.printJob.delete({
      where: { id },
    });

    return printJob;
  }

  /**
   * Delete all print jobs (use with caution!)
   */
  async deleteAllPrintJobs() {
    const result = await prisma.printJob.deleteMany({});
    return result;
  }

  /**
   * Get print jobs by user
   */
  async getPrintJobsByUser(userId: string) {
    const printJobs = await prisma.printJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      },
    });

    return printJobs;
  }

/**
 * Delete all completed and cancelled jobs
 * Used for weekly reset
 */
async deleteCompletedAndCancelledJobs(): Promise<{ count: number }> {
  const result = await prisma.printJob.deleteMany({
    where: {
      OR: [
        { status: 'COMPLETED' },
        { status: 'CANCELLED' },
      ],
    },
  });
  return { count: result.count };
}

/**
 * Reset all WAITING jobs to PENDING status
 * Used for weekly reset - gives jobs a fresh start when user usage resets
 */
async resetWaitingJobsToPending(): Promise<{ count: number }> {
  const result = await prisma.printJob.updateMany({
    where: {
      status: 'WAITING',
    },
    data: {
      status: 'PENDING',
    },
  });
  return { count: result.count };
}

/**
 * Get list of unique user IDs who have WAITING jobs
 * Used for weekly reset - these users need to be preserved
 * @deprecated Use getUserIdsWithActiveJobs instead
 */
async getUserIdsWithWaitingJobs(): Promise<string[]> {
  const jobs = await prisma.printJob.findMany({
    where: {
      status: 'WAITING',
    },
    select: {
      userId: true,
    },
    distinct: ['userId'],
  });
  
  return jobs.map(job => job.userId);
}

/**
 * Get list of unique user IDs who have active jobs
 * Active = WAITING, PENDING, IN_PROGRESS, ACTION_NEEDED
 * Used for weekly reset - these users need to be preserved
 */
async getUserIdsWithActiveJobs(): Promise<string[]> {
  const jobs = await prisma.printJob.findMany({
    where: {
      status: {
        in: ['WAITING', 'PENDING', 'IN_PROGRESS', 'ACTION_NEEDED'],
      },
    },
    select: {
      userId: true,
    },
    distinct: ['userId'],
  });
  
  return jobs.map(job => job.userId);
}

/**
 * Get all file URLs from active jobs (not COMPLETED or CANCELLED)
 * Used for weekly reset - to preserve STL files still in use
 */
async getActiveJobFileUrls(): Promise<string[]> {
  const jobs = await prisma.printJob.findMany({
    where: {
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
    select: {
      stlUrl: true,
    },
  });
  
  return jobs.map(job => job.stlUrl).filter(Boolean);
}  /**
   * Get job statistics
   */
  async getJobStatistics() {
    const [total, pending, waiting, inProgress, actionNeeded, completed, cancelled, failed] = await Promise.all([
      prisma.printJob.count(),
      prisma.printJob.count({ where: { status: 'PENDING' } }),
      prisma.printJob.count({ where: { status: 'WAITING' } }),
      prisma.printJob.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.printJob.count({ where: { status: 'ACTION_NEEDED' } }),
      prisma.printJob.count({ where: { status: 'COMPLETED' } }),
      prisma.printJob.count({ where: { status: 'CANCELLED' } }),
      prisma.printJob.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        waiting,
        inProgress,
        actionNeeded,
        completed,
        cancelled,
        failed,
      },
    };
  }
}

export default new PrintJobService();