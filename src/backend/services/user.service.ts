// services/user.service.ts

import prisma from '../lib/prisma';

class UserService {
  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        printJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 jobs
        },
      },
    });

    return user;
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { printJobs: true },
        },
      },
    });

    return users;
  }

  /**
   * Update user's filament usage (set to exact value)
   */
  async updateUserUsage(userId: string, usage: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { usage },
      include: {
        _count: {
          select: { printJobs: true },
        },
      },
    });

    return user;
  }

  /**
   * Add to user's filament usage (increment)
   */
  async addUserUsage(userId: string, amountToAdd: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        usage: {
          increment: amountToAdd,
        },
      },
      include: {
        _count: {
          select: { printJobs: true },
        },
      },
    });

    return user;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        printJobs: {
          select: {
            status: true,
            createdAt: true,
            material: true,
            quantity: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const totalJobs = user.printJobs.length;
    const completedJobs = user.printJobs.filter(
      (job) => job.status === 'COMPLETED'
    ).length;
    const pendingJobs = user.printJobs.filter(
      (job) => job.status === 'PENDING'
    ).length;
    const inProgressJobs = user.printJobs.filter(
      (job) => job.status === 'IN_PROGRESS'
    ).length;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        discord: user.discord,
        usage: user.usage,
      },
      stats: {
        totalJobs,
        completedJobs,
        pendingJobs,
        inProgressJobs,
        filamentUsed: user.usage,
      },
    };
  }
}

export default new UserService();