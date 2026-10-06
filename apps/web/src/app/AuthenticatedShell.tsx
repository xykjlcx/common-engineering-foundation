import type { ReactNode } from 'react';
import { PendingNoticesDialog } from '@/modules/admin/messages/components/PendingNoticesDialog';
import { isDemoBuild } from '@/config';
import { Shell } from './shell/Shell';

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <Shell>
      {children}
      {!isDemoBuild && <PendingNoticesDialog />}
    </Shell>
  );
}
