import type { z } from 'zod';
import type { auditSearchSchema } from './model';

export type AuditSearch = z.output<typeof auditSearchSchema>;

export interface AuditPageProps {
  permissions: string[];
  systemAdmin: boolean;
  search: AuditSearch;
  onSearchChange: (patch: Partial<AuditSearch>) => void;
}
