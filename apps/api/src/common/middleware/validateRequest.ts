import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

interface RequestValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as unknown as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as unknown as Request['params'];
      }
      next();
    } catch (error: unknown) {
      if (
        error instanceof ZodError ||
        (error && typeof error === 'object' && ('issues' in error || (error as { name?: string }).name === 'ZodError'))
      ) {
        const issues = ((error as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues || []).map(
          (issue) => ({
            path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
            message: issue.message,
          })
        );
        next(new ValidationError('Invalid request payload', issues));
        return;
      }
      next(error);
    }
  };
};
