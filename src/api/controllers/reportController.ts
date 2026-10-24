import { NextFunction, Request, Response } from 'express';
import { ReportStore } from '../../data/reportStore';
import { Report } from '../../core/Report';
import { BadRequestError, ReportNotFoundError } from '../../core/errors';

export class ReportController {
  constructor(private readonly store: ReportStore) {}

  list = (_req: Request, res: Response): void => {
    res.status(200).json(this.store.list());
  };

  generate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = req.params.id;
      const report: Report | undefined = this.store.get(id);
      if (!report) {
        throw new ReportNotFoundError();
      }
      const role = req.query.role;
      if (typeof role !== 'string' || role.trim() === '') {
        throw new BadRequestError('Query parameter "role" is required');
      }
      const content = report.generate(role);
      res.status(200).json({ id, content });
    } catch (error) {
      next(error);
    }
  };
}
