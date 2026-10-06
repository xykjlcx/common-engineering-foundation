import type { ManagedMenuType, ManagedMenuRecord } from './api';
import type { Subsystem } from '@/modules/types';

export type MenuFormState =
  | { mode: 'create'; parentId: string | null; type: ManagedMenuType }
  | { mode: 'edit'; menu: ManagedMenuRecord };

export type SubsystemFormState = { mode: 'create' } | { mode: 'edit'; subsystem: Subsystem };

export interface MenuCapabilities {
  create: boolean;
  update: boolean;
  delete: boolean;
  toggle: boolean;
}

export type MenuOverlay =
  | { kind: 'none' }
  | { kind: 'menu-form'; state: MenuFormState }
  | { kind: 'subsystem-form'; state: SubsystemFormState }
  | { kind: 'delete'; menu: ManagedMenuRecord };
