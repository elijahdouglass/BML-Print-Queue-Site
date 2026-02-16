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
// services/user.service.ts - Add this method to your existing UserService class

/**
 * Delete all users EXCEPT those in the provided list
 * Used for weekly reset - preserves users who have active jobs
 */
async deleteUsersExcept(userIdsToKeep: string[]): Promise<{ count: number }> {
  const result = await prisma.user.deleteMany({
    where: {
      id: {
        notIn: userIdsToKeep,
      },
    },
  });
  return { count: result.count };
}

/**
 * Reset usage to 0 for specific users
 * Used for weekly reset - resets usage for preserved users with active jobs
 */
async resetUsageForUsers(userIds: string[]): Promise<{ count: number }> {
  const result = await prisma.user.updateMany({
    where: {
      id: {
        in: userIds,
      },
    },
    data: {
      usage: 0,
    },
  });
  return { count: result.count };
}

/**
 * Delete all users
 * Used for complete reset (if needed)
 */
async deleteAllUsers(): Promise<{ count: number }> {
  const result = await prisma.user.deleteMany({});
  return { count: result.count };
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