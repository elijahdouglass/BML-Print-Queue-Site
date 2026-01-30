import { z } from 'zod';

export const JobStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED']);

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  discord: z.string().optional(),
});

export const createPrintJobSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().min(1, 'User name is required'),
  userEmail: z.string().email('Invalid email address'),
  userDiscord: z.string().optional(),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().int().positive().default(1),
  color: z.string().min(1, 'Color is required'),
  material: z.string().min(1, 'Material is required'),
  userSuppliedMaterial: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  stlUrl: z.string().url('Invalid STL URL'),
});

export const updatePrintJobStatusSchema = z.object({
  status: JobStatus,
});

export const updatePrintJobSchema = z.object({
  partName: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  color: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
  userSuppliedMaterial: z.boolean().optional(),
  specialInstructions: z.string().optional(),
  stlUrl: z.string().url().optional(),
  status: JobStatus.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePrintJobInput = z.infer<typeof createPrintJobSchema>;
export type UpdatePrintJobStatusInput = z.infer<typeof updatePrintJobStatusSchema>;
export type UpdatePrintJobInput = z.infer<typeof updatePrintJobSchema>;