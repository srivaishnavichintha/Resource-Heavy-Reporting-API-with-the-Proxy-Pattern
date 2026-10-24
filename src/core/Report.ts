export interface Report {
  getTitle(): string;
  generate(userRole: string): string;
}
