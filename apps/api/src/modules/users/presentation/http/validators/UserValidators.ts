import { z } from 'zod';

export const createUserSchema = {
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters'),
    email: z
      .string()
      .trim()
      .email('Must be a valid email address'),
    bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').optional(),
  }),
};

export const getUserByIdSchema = {
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
};
