import { DashboardScene } from './list/DashboardScene';
import type { DashboardPageProps } from './types';

export function DashboardPage(props: DashboardPageProps) {
  return <DashboardScene {...props} />;
}
