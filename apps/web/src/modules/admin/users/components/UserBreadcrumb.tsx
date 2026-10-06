import type { ComponentProps } from 'react';
import { Users } from 'lucide-react';
import { PageBreadcrumb } from '@/components/pro/page-scaffold';

/** 用户表单与详情共用的层级语义，视觉由页面骨架承担。 */
export function UserBreadcrumb(props: Omit<ComponentProps<typeof PageBreadcrumb>, 'icon'>) {
  return <PageBreadcrumb data-slot="user-breadcrumb" icon={<Users strokeWidth={1.6} />} {...props} />;
}
