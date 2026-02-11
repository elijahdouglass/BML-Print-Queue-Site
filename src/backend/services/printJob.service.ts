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
        pickupLocation: data.pickupLocation, // Added this field
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
  async updatePrintJobStatus(id: string, data: UpdatePrintJobStatusInput) {
    const printJob = await prisma.printJob.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: {
        user: true,
      },
    });

    return printJob;
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