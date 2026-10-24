import express, { Express } from 'express';
import { createReportStore, ReportStore } from '../data/reportStore';
import { ReportController } from './controllers/reportController';
import { MetricsController } from './controllers/metricsController';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(store: ReportStore = createReportStore()): Express {
  const app = express();
  const reportController = new ReportController(store);
  const metricsController = new MetricsController(store);

  app.disable('x-powered-by');
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/api/metrics', metricsController.get);
  app.post('/api/metrics/reset', metricsController.reset);
  app.get('/api/reports', reportController.list);
  app.get('/api/reports/:id/generate', reportController.generate);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
