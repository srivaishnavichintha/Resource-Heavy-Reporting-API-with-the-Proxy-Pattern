import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/api/app';
import { MetricsTracker } from '../src/core/MetricsTracker';

describe('API', () => {
  let app: Express;

  beforeEach(() => {
    MetricsTracker.reset();
    app = createApp();
  });

  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/metrics returns the global count', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total_instantiations: 0 });
    MetricsTracker.increment();
    const after = await request(app).get('/api/metrics');
    expect(after.body).toEqual({ total_instantiations: 1 });
  });

  it('GET /api/reports returns the three seeded reports without instantiating anything', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'report-1', title: 'Financial Q1', required_role: 'admin' },
      { id: 'report-2', title: 'User Analytics', required_role: 'manager' },
      { id: 'report-3', title: 'System Status', required_role: 'guest' }
    ]);
    const metrics = await request(app).get('/api/metrics');
    expect(metrics.body).toEqual({ total_instantiations: 0 });
  });

  it.each([
    ['report-1', 'admin', 'Financial Q1'],
    ['report-2', 'manager', 'User Analytics'],
    ['report-3', 'guest', 'System Status']
  ])('GET /api/reports/%s/generate?role=%s returns 200', async (id, role, title) => {
    const res = await request(app).get(`/api/reports/${id}/generate`).query({ role });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, content: `Report content for ${title}` });
  });

  it.each([
    ['report-1', 'guest'],
    ['report-1', 'manager'],
    ['report-2', 'guest'],
    ['report-2', 'admin'],
    ['report-3', 'admin'],
    ['report-3', 'manager']
  ])('GET /api/reports/%s/generate?role=%s returns 403 and instantiates nothing', async (id, role) => {
    const res = await request(app).get(`/api/reports/${id}/generate`).query({ role });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Access Denied' });
    const metrics = await request(app).get('/api/metrics');
    expect(metrics.body).toEqual({ total_instantiations: 0 });
  });

  it('returns 404 for a missing report and instantiates nothing', async () => {
    const res = await request(app).get('/api/reports/non-existent-report/generate').query({ role: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Report not found' });
    const metrics = await request(app).get('/api/metrics');
    expect(metrics.body).toEqual({ total_instantiations: 0 });
  });

  it('returns 400 when the role query parameter is missing', async () => {
    const res = await request(app).get('/api/reports/report-1/generate');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Query parameter "role" is required' });
    const metrics = await request(app).get('/api/metrics');
    expect(metrics.body).toEqual({ total_instantiations: 0 });
  });

  it('returns 400 when the role is empty or repeated', async () => {
    const empty = await request(app).get('/api/reports/report-1/generate?role=');
    expect(empty.status).toBe(400);
    const repeated = await request(app).get('/api/reports/report-1/generate?role=admin&role=admin');
    expect(repeated.status).toBe(400);
  });

  it('treats roles as case-sensitive exact matches', async () => {
    const res = await request(app).get('/api/reports/report-1/generate').query({ role: 'Admin' });
    expect(res.status).toBe(403);
  });

  it('POST /api/metrics/reset returns 200 and sets the count back to 0', async () => {
    await request(app).get('/api/reports/report-3/generate').query({ role: 'guest' });
    expect((await request(app).get('/api/metrics')).body).toEqual({ total_instantiations: 1 });
    const res = await request(app).post('/api/metrics/reset');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Metrics reset successfully' });
    expect((await request(app).get('/api/metrics')).body).toEqual({ total_instantiations: 0 });
  });

  it('after a reset the first generate counts as 1 again', async () => {
    await request(app).get('/api/reports/report-3/generate').query({ role: 'guest' });
    await request(app).post('/api/metrics/reset');
    await request(app).get('/api/reports/report-3/generate').query({ role: 'guest' });
    expect((await request(app).get('/api/metrics')).body).toEqual({ total_instantiations: 1 });
  });

  it('concurrent requests for the same report create one heavy object', async () => {
    const responses = await Promise.all(
      Array.from({ length: 25 }, () => request(app).get('/api/reports/report-3/generate').query({ role: 'guest' }))
    );
    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect((await request(app).get('/api/metrics')).body).toEqual({ total_instantiations: 1 });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });
});
