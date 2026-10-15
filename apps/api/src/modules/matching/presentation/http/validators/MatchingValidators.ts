import { z } from 'zod';

export const joinQueueSchema = {
  body: z.object({
    filter: z.enum(['ANY', 'MALE', 'FEMALE']).default('ANY'),
  }),
};

export const getCallSessionSchema = {
  params: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
};

export const endCallSessionSchema = {
  params: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
  body: z
    .object({
      emergencyReport: z.boolean().optional(),
    })
    .optional(),
};
