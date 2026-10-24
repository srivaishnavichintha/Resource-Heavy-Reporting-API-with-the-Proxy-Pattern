import request from 'supertest';
import { createApp } from '../src/api/app';

describe('Assignment flow', () => {
  it('follows the intended sequence end to end', async () => {
    const app = createApp();
    const metrics = async () => (await request(app).get('/api/metrics')).body.total_instantiations;
    const generate = (id: string, role: string) => request(app).get(`/api/reports/${id}/generate`).query({ role });

    expect((await request(app).post('/api/metrics/reset')).status).toBe(200);
    expect(await metrics()).toBe(0);

    const list = await request(app).get('/api/reports');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(3);
    expect(await metrics()).toBe(0);

    const first = await generate('report-3', 'guest');
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ id: 'report-3', content: 'Report content for System Status' });
    expect(await metrics()).toBe(1);

    for (let i = 0; i < 3; i++) {
      expect((await generate('report-3', 'guest')).status).toBe(200);
      expect(await metrics()).toBe(1);
    }

    const denied = await generate('report-1', 'guest');
    expect(denied.status).toBe(403);
    expect(denied.body).toEqual({ error: 'Access Denied' });
    expect(await metrics()).toBe(1);

    const admin = await generate('report-1', 'admin');
    expect(admin.status).toBe(200);
    expect(admin.body).toEqual({ id: 'report-1', content: 'Report content for Financial Q1' });
    expect(await metrics()).toBe(2);
  });
});
