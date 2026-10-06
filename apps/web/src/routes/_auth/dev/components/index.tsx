import { createFileRoute, redirect } from '@tanstack/react-router';
import { DOC_ENTRIES } from '../-docs/registry';

// /dev/components 本身没有内容，直接落到注册表第一条（导航第一项）。
export const Route = createFileRoute('/_auth/dev/components/')({
  beforeLoad: () => {
    const first = DOC_ENTRIES[0];
    if (!first) return;
    redirect({ to: '/dev/components/$key', params: { key: first.key }, throw: true });
  },
});
