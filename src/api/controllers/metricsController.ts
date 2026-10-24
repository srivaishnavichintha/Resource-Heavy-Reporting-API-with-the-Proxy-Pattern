import { Request, Response } from 'express';
import { MetricsTracker } from '../../core/MetricsTracker';
import { ReportStore } from '../../data/reportStore';

export class MetricsController {
  constructor(private readonly store: ReportStore) {}

  get = (_req: Request, res: Response): void => {
    res.status(200).json({ total_instantiations: MetricsTracker.getCount() });
  };

  reset = (_req: Request, res: Response): void => {
    MetricsTracker.reset();
    this.store.reset();
    res.status(200).json({ message: 'Metrics reset successfully' });
  };
}
