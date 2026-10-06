import type { ReactNode } from 'react';

export interface RowMenuItem {
  /** 稳定 key，同时用于测试定位 */
  id: string;
  /** 菜单项文案。pro 层不做 i18n，由业务层传入已翻译文本 */
  label: ReactNode;

  icon?: ReactNode;

  shortcut?: string;

  tone?: 'default' | 'danger';
  disabled?: boolean;

  separatorBefore?: boolean;
  onSelect: () => void;
}
