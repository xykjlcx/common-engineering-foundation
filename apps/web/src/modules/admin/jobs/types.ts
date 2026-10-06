import type { z } from 'zod';
import type { jobsSearchSchema } from './model';
export type JobsSearch = z.infer<typeof jobsSearchSchema>;
export interface JobsPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  search: JobsSearch;
  onSearchChange: (patch: Partial<JobsSearch>) => void;
}
