import { NextFunction, Request, Response } from 'express';
import { AccessDeniedError, BadRequestError, ReportNotFoundError } from '../../core/errors';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AccessDeniedError) {
    res.status(403).json({ error: 'Access Denied' });
    return;
  }
  if (error instanceof ReportNotFoundError) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  if (error instanceof BadRequestError) {
    res.status(400).json({ error: error.message });
    return;
  }
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: 'Invalid request' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
}
