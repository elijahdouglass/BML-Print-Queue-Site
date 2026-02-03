// validation.ts

import { z } from 'zod';

// Update JobStatus enum to include WAITING
export const JobStatusEnum = z.enum([
  'PENDING',
  'WAITING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'FAILED'
]);

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  discord: z.string().max(255).optional(),
});

export const createPrintJobSchema = z.object({
  userName: z.string().min(1, 'User name is required').max(255),
  userEmail: z.string().email('Invalid email address').max(255),
  userDiscord: z.string().max(255).optional(),
  partName: z.string().min(1, 'Part name is required').max(255),
  quantity: z.number().int().positive('Quantity must be positive').default(1),
  color: z.string().min(1, 'Color is required').max(100),
  material: z.string().min(1, 'Material is required').max(100),
  userSuppliedMaterial: z.boolean().default(false),
  specialInstructions: z.string().max(5000).optional(),
  stlUrl: z.string().url('Invalid STL URL'),
});

export const updatePrintJobSchema = z.object({
  partName: z.string().min(1).max(255).optional(),
  quantity: z.number().int().positive().optional(),
  color: z.string().min(1).max(100).optional(),
  material: z.string().min(1).max(100).optional(),
  userSuppliedMaterial: z.boolean().optional(),
  specialInstructions: z.string().max(5000).optional(),
  stlUrl: z.string().url().optional(),
  status: JobStatusEnum.optional(),
});

export const updatePrintJobStatusSchema = z.object({
  status: JobStatusEnum,
});

export const updateUserUsageSchema = z.object({
  usage: z
    .number()
    .nonnegative('Usage must be a positive number')
    .finite('Usage must be a finite number'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePrintJobInput = z.infer<typeof createPrintJobSchema>;
export type UpdatePrintJobInput = z.infer<typeof updatePrintJobSchema>;
export type UpdatePrintJobStatusInput = z.infer<typeof updatePrintJobStatusSchema>;
export type UpdateUserUsageInput = z.infer<typeof updateUserUsageSchema>;
export type JobStatus = z.infer<typeof JobStatusEnum>;