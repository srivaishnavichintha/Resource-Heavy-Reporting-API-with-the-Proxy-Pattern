import { ProtectionReportProxy } from '../proxies/ProtectionReportProxy';
import { VirtualReportProxy } from '../proxies/VirtualReportProxy';

interface ReportSeed {
  id: string;
  title: string;
  requiredRole: string;
}

const SEEDS: readonly ReportSeed[] = [
  { id: 'report-1', title: 'Financial Q1', requiredRole: 'admin' },
  { id: 'report-2', title: 'User Analytics', requiredRole: 'manager' },
  { id: 'report-3', title: 'System Status', requiredRole: 'guest' }
];

export interface ReportSummary {
  id: string;
  title: string;
  required_role: string;
}

export class ReportStore {
  private reports = new Map<string, ProtectionReportProxy>();

  constructor() {
    this.seed();
  }

  get(id: string): ProtectionReportProxy | undefined {
    return this.reports.get(id);
  }

  list(): ReportSummary[] {
    return Array.from(this.reports.entries()).map(([id, report]) => ({
      id,
      title: report.getTitle(),
      required_role: report.getRequiredRole()
    }));
  }

  reset(): void {
    this.seed();
  }

  private seed(): void {
    this.reports = new Map(
      SEEDS.map(({ id, title, requiredRole }) => [
        id,
        new ProtectionReportProxy(new VirtualReportProxy(id, title), requiredRole)
      ])
    );
  }
}

export function createReportStore(): ReportStore {
  return new ReportStore();
}
