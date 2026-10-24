import { MetricsTracker } from '../src/core/MetricsTracker';
import { HeavyReportGenerator } from '../src/core/HeavyReportGenerator';

describe('MetricsTracker', () => {
  beforeEach(() => {
    MetricsTracker.reset();
  });

  it('starts at 0', () => {
    expect(MetricsTracker.getCount()).toBe(0);
  });

  it('increment() adds one each call', () => {
    MetricsTracker.increment();
    MetricsTracker.increment();
    expect(MetricsTracker.getCount()).toBe(2);
  });

  it('HeavyReportGenerator constructor increments the count', () => {
    expect(MetricsTracker.getCount()).toBe(0);
    new HeavyReportGenerator('report-1', 'Financial Q1');
    expect(MetricsTracker.getCount()).toBe(1);
    new HeavyReportGenerator('report-2', 'User Analytics');
    expect(MetricsTracker.getCount()).toBe(2);
  });

  it('reset() returns the count to 0', () => {
    new HeavyReportGenerator('report-1', 'Financial Q1');
    expect(MetricsTracker.getCount()).toBe(1);
    MetricsTracker.reset();
    expect(MetricsTracker.getCount()).toBe(0);
  });
});
