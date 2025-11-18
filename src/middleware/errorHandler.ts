import { Request, Response, NextFunction } from 'express';
import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

/**
 * Standard API error response
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  // Handle tRPC errors
  if (err instanceof TRPCError) {
    const statusCode = getHTTPStatusCodeFromError(err);
    const response: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.cause,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  // Handle generic errors
  const response: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const response: ApiError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}
