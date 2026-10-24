import { Report } from '../core/Report';
import { AccessDeniedError } from '../core/errors';

export class ProtectionReportProxy implements Report {
  constructor(private readonly report: Report, private readonly requiredRole: string) {}

  getTitle(): string {
    return this.report.getTitle();
  }

  getRequiredRole(): string {
    return this.requiredRole;
  }

  generate(userRole: string): string {
    if (userRole !== this.requiredRole) {
      throw new AccessDeniedError();
    }
    return this.report.generate(userRole);
  }
}
