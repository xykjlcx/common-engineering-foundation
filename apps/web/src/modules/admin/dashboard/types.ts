import type { MeDto } from './api/schema';
import type { MenuRecord } from '@/modules/types';
export interface DashboardPageProps {
  identity: MeDto;
  onNavigate: (path: NonNullable<MenuRecord['path']>) => void;
}
