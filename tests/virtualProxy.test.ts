import { MetricsTracker } from '../src/core/MetricsTracker';
import { Report } from '../src/core/Report';
import { VirtualReportProxy } from '../src/proxies/VirtualReportProxy';

describe('VirtualReportProxy', () => {
  beforeEach(() => {
    MetricsTracker.reset();
  });

  it('implements Report', () => {
    const proxy: Report = new VirtualReportProxy('report-3', 'System Status');
    expect(typeof proxy.getTitle).toBe('function');
    expect(typeof proxy.generate).toBe('function');
  });

  it('constructor does not instantiate HeavyReportGenerator', () => {
    new VirtualReportProxy('report-3', 'System Status');
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it('getTitle() returns the cached title without instantiating HeavyReportGenerator', () => {
    const proxy = new VirtualReportProxy('report-3', 'System Status');
    expect(proxy.getTitle()).toBe('System Status');
    expect(proxy.getTitle()).toBe('System Status');
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it('first generate() instantiates HeavyReportGenerator exactly once', () => {
    const proxy = new VirtualReportProxy('report-3', 'System Status');
    expect(proxy.generate('guest')).toBe('Report content for System Status');
    expect(MetricsTracker.getCount()).toBe(1);
  });

  it('repeated generate() reuses the same instance', () => {
    const proxy = new VirtualReportProxy('report-3', 'System Status');
    const counts: number[] = [MetricsTracker.getCount()];
    for (let i = 0; i < 3; i++) {
      proxy.generate('guest');
      counts.push(MetricsTracker.getCount());
    }
    expect(counts).toEqual([0, 1, 1, 1]);
  });

  it('keeps one heavy instance per proxy instance', () => {
    const first = new VirtualReportProxy('report-1', 'Financial Q1');
    const second = new VirtualReportProxy('report-2', 'User Analytics');
    first.generate('admin');
    first.generate('admin');
    second.generate('manager');
    expect(MetricsTracker.getCount()).toBe(2);
  });

  it('is safe against concurrent first calls', async () => {
    const proxy = new VirtualReportProxy('report-3', 'System Status');
    const results = await Promise.all(
      Array.from({ length: 50 }, () => Promise.resolve().then(() => proxy.generate('guest')))
    );
    expect(new Set(results)).toEqual(new Set(['Report content for System Status']));
    expect(MetricsTracker.getCount()).toBe(1);
  });
});
