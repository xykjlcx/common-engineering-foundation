import type { z } from 'zod';
import type { messagesSearchSchema } from './model';
export type MessagesSearch = z.infer<typeof messagesSearchSchema>;
export interface MessagesPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  search: MessagesSearch;
  onSearchChange: (patch: Partial<MessagesSearch>) => void;
}
