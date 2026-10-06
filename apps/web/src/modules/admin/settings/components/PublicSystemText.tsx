import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { isDemoBuild } from '@/config';
import { publicSettingsQuery } from '../api';
export function PublicSystemText({
  field,
  fallback,
}: {
  field: 'appName' | 'loginDescription';
  fallback: ReactNode;
}) {
  const query = useQuery({ ...publicSettingsQuery, enabled: !isDemoBuild });
  return <>{query.data?.[field] ?? fallback}</>;
}
