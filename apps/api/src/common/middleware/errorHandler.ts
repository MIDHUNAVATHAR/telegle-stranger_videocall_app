import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (
    err instanceof ZodError ||
    (err && typeof err === 'object' && ('issues' in err || (err as { name?: string }).name === 'ZodError'))
  ) {
    const issues = ((err as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues || []).map(
      (issue) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
        message: issue.message,
      })
    );
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        name: 'ValidationError',
        message: 'Invalid request payload',
        details: issues,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Operational Server Error: ${err.message}`, err, {
        path: req.path,
        method: req.method,
        code: err.code,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        name: err.name,
        message: err.message,
        details: err.details ?? [],
      },
    });
    return;
  }

  // Unhandled / system errors
  logger.error(`Unhandled Exception: ${err.message}`, err, {
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      name: 'InternalServerError',
      message: 'An unexpected internal error occurred. Please try again later.',
      details: [],
    },
  });
};
