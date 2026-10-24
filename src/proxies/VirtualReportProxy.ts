import { Report } from '../core/Report';
import { HeavyReportGenerator } from '../core/HeavyReportGenerator';

export class VirtualReportProxy implements Report {
  private realSubject: HeavyReportGenerator | null = null;

  constructor(private readonly reportId: string, private readonly title: string) {}

  getTitle(): string {
    return this.title;
  }

  generate(userRole: string): string {
    if (this.realSubject === null) {
      this.realSubject = new HeavyReportGenerator(this.reportId, this.title);
    }
    return this.realSubject.generate(userRole);
  }
}
