import { z } from 'zod';
import { displayNameSchema, ageSchema, genderSchema } from '@donkey-play/validation';

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

export const updateProfileSchema = {
  body: z.object({
    display_name: displayNameSchema.optional(),
    bio: z.string().trim().max(200, 'Bio cannot exceed 200 characters').optional(),
    gender: genderSchema.optional(),
    age: ageSchema.optional(),
    avatar_url: z.string().trim().url().optional().or(z.literal('')),
  }),
};

export const updatePreferencesSchema = {
  body: z.object({
    preferred_gender: z.enum(['ANY', 'MALE', 'FEMALE']).optional(),
    allow_incoming_calls: z.boolean().optional(),
    sound_enabled: z.boolean().optional(),
  }),
};
