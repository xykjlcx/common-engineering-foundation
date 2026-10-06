import { createFileRoute, notFound } from '@tanstack/react-router';
import { findDocEntry } from '../-docs/registry';
import { DocPage } from '../-docs/ui/DocPage';

// 组件站单页：URL 段即注册表 key。注册表里没有的 key 走 404，不渲染空壳页。
export const Route = createFileRoute('/_auth/dev/components/$key')({
  beforeLoad: ({ params }) => {
    if (!findDocEntry(params.key)) notFound({ throw: true });
  },
  component: ComponentDocRoute,
});

function ComponentDocRoute() {
  const { key } = Route.useParams();
  const entry = findDocEntry(key);
  if (entry) return <DocPage entry={entry} />;
  notFound({ throw: true });
  return null;
}
