import { MetricsTracker } from '../src/core/MetricsTracker';
import { Report } from '../src/core/Report';
import { AccessDeniedError } from '../src/core/errors';
import { ProtectionReportProxy } from '../src/proxies/ProtectionReportProxy';
import { VirtualReportProxy } from '../src/proxies/VirtualReportProxy';

class SpyReport implements Report {
  titleCalls = 0;
  generateCalls = 0;

  getTitle(): string {
    this.titleCalls += 1;
    return 'Spy';
  }

  generate(userRole: string): string {
    this.generateCalls += 1;
    return `generated for ${userRole}`;
  }
}

describe('ProtectionReportProxy', () => {
  beforeEach(() => {
    MetricsTracker.reset();
  });

  it('implements Report', () => {
    const proxy: Report = new ProtectionReportProxy(new SpyReport(), 'admin');
    expect(typeof proxy.getTitle).toBe('function');
    expect(typeof proxy.generate).toBe('function');
  });

  it('getTitle() is allowed without authorization', () => {
    const spy = new SpyReport();
    const proxy = new ProtectionReportProxy(spy, 'admin');
    expect(proxy.getTitle()).toBe('Spy');
    expect(spy.titleCalls).toBe(1);
  });

  it('exposes the required role', () => {
    expect(new ProtectionReportProxy(new SpyReport(), 'manager').getRequiredRole()).toBe('manager');
  });

  it('rejects an unauthorized role with AccessDeniedError', () => {
    const proxy = new ProtectionReportProxy(new SpyReport(), 'admin');
    expect(() => proxy.generate('guest')).toThrow(AccessDeniedError);
    expect(() => proxy.generate('guest')).toThrow('Access Denied');
  });

  it('never calls the wrapped report when unauthorized', () => {
    const spy = new SpyReport();
    const proxy = new ProtectionReportProxy(spy, 'admin');
    expect(() => proxy.generate('guest')).toThrow(AccessDeniedError);
    expect(spy.generateCalls).toBe(0);
  });

  it('requires an exact role match', () => {
    const spy = new SpyReport();
    const proxy = new ProtectionReportProxy(spy, 'admin');
    for (const role of ['Admin', 'ADMIN', ' admin', 'admin ', 'administrator', '']) {
      expect(() => proxy.generate(role)).toThrow(AccessDeniedError);
    }
    expect(spy.generateCalls).toBe(0);
  });

  it('delegates an authorized request to the wrapped report', () => {
    const spy = new SpyReport();
    const proxy = new ProtectionReportProxy(spy, 'admin');
    expect(proxy.generate('admin')).toBe('generated for admin');
    expect(spy.generateCalls).toBe(1);
  });

  it('unauthorized role does NOT instantiate HeavyReportGenerator through a VirtualReportProxy', () => {
    const proxy = new ProtectionReportProxy(new VirtualReportProxy('report-1', 'Financial Q1'), 'admin');
    expect(() => proxy.generate('guest')).toThrow(AccessDeniedError);
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it('authorized role instantiates HeavyReportGenerator once through a VirtualReportProxy', () => {
    const proxy = new ProtectionReportProxy(new VirtualReportProxy('report-1', 'Financial Q1'), 'admin');
    expect(proxy.generate('admin')).toBe('Report content for Financial Q1');
    expect(proxy.generate('admin')).toBe('Report content for Financial Q1');
    expect(MetricsTracker.getCount()).toBe(1);
  });
});
