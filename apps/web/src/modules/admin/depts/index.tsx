import type { ComponentProps } from 'react';
import { DeptsScene } from './list/DeptsScene';

export function DeptsPage(props: ComponentProps<typeof DeptsScene>) {
  return <DeptsScene {...props} />;
}
