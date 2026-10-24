import { Report } from './Report';
import { MetricsTracker } from './MetricsTracker';

export class HeavyReportGenerator implements Report {
  constructor(private readonly reportId: string, private readonly title: string) {
    MetricsTracker.increment();
  }

  getId(): string {
    return this.reportId;
  }

  getTitle(): string {
    return this.title;
  }

  generate(_userRole: string): string {
    return `Report content for ${this.title}`;
  }
}
