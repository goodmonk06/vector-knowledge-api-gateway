import { Request, Response, NextFunction } from 'express';

/**
 * Simple request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const logLevel = statusCode >= 400 ? 'ERROR' : 'INFO';
    const emoji = statusCode >= 400 ? '❌' : '✓';

    console.log(
      `${emoji} [${logLevel}] ${method} ${originalUrl} - ${statusCode} (${duration}ms)`
    );
  });

  next();
}
