import { MetricsTracker } from '../src/core/MetricsTracker';
import { HeavyReportGenerator } from '../src/core/HeavyReportGenerator';
import { Report } from '../src/core/Report';
import { createReportStore } from '../src/data/reportStore';
import { ProtectionReportProxy } from '../src/proxies/ProtectionReportProxy';

describe('HeavyReportGenerator', () => {
  beforeEach(() => {
    MetricsTracker.reset();
  });

  it('implements the Report interface with deterministic content', () => {
    const report: Report = new HeavyReportGenerator('report-1', 'Financial Q1');
    expect(report.getTitle()).toBe('Financial Q1');
    expect(report.generate('admin')).toBe('Report content for Financial Q1');
  });
});

describe('ReportStore seed data', () => {
  beforeEach(() => {
    MetricsTracker.reset();
  });

  it('lists exactly the three seeded reports', () => {
    expect(createReportStore().list()).toEqual([
      { id: 'report-1', title: 'Financial Q1', required_role: 'admin' },
      { id: 'report-2', title: 'User Analytics', required_role: 'manager' },
      { id: 'report-3', title: 'System Status', required_role: 'guest' }
    ]);
  });

  it('stores protection proxies and does not instantiate heavy objects on startup or listing', () => {
    const store = createReportStore();
    store.list();
    expect(store.get('report-1')).toBeInstanceOf(ProtectionReportProxy);
    expect(store.get('report-2')).toBeInstanceOf(ProtectionReportProxy);
    expect(store.get('report-3')).toBeInstanceOf(ProtectionReportProxy);
    expect(store.get('report-4')).toBeUndefined();
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it.each([
    ['report-1', 'admin'],
    ['report-2', 'manager'],
    ['report-3', 'guest']
  ])('%s generates for role %s', (id, role) => {
    const store = createReportStore();
    const content = store.get(id)!.generate(role);
    expect(content).toBe(`Report content for ${store.get(id)!.getTitle()}`);
  });

  it.each([
    ['report-1', 'guest'],
    ['report-1', 'manager'],
    ['report-2', 'guest'],
    ['report-2', 'admin'],
    ['report-3', 'admin'],
    ['report-3', 'manager']
  ])('%s denies role %s without instantiating anything', (id, role) => {
    const store = createReportStore();
    expect(() => store.get(id)!.generate(role)).toThrow('Access Denied');
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it('reset() rebuilds the proxies so the heavy objects are lazily created again', () => {
    const store = createReportStore();
    store.get('report-3')!.generate('guest');
    expect(MetricsTracker.getCount()).toBe(1);
    MetricsTracker.reset();
    store.reset();
    store.get('report-3')!.generate('guest');
    expect(MetricsTracker.getCount()).toBe(1);
  });
});
