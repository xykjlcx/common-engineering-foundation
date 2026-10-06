import type { z } from 'zod';
import type { noticesSearchSchema } from './model';
export type NoticesSearch = z.infer<typeof noticesSearchSchema>;
export interface NoticesPageProps {
  search: NoticesSearch;
  onSearchChange: (patch: Partial<NoticesSearch>) => void;
  permissions: string[];
  systemAdmin?: boolean;
}
