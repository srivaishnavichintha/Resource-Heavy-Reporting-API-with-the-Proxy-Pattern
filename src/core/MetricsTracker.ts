export class MetricsTracker {
  private static totalInstantiations = 0;

  private constructor() {}

  static getCount(): number {
    return MetricsTracker.totalInstantiations;
  }

  static increment(): void {
    MetricsTracker.totalInstantiations += 1;
  }

  static reset(): void {
    MetricsTracker.totalInstantiations = 0;
  }
}
