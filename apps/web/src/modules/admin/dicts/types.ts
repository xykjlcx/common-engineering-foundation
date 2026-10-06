import type { z } from 'zod';
import type { dictSearchSchema } from './model';

export type DictSearch = z.infer<typeof dictSearchSchema>;

export interface DictPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  search: DictSearch;
  onSearchChange: (patch: Partial<DictSearch>) => void;
}

export type DictDialog =
  | { kind: 'createType' }
  | { kind: 'editType' | 'deleteType' | 'editItem' | 'deleteItem'; id: string }
  | { kind: 'createItem'; typeId: string };
