import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { TableText } from '@/components/pro/TableText';

// 单元格排印状态矩阵（TableText：六档语气 × 默认 / muted / mono）。
// TableShell 退役后从 sections/table-shell.tsx 拆出，页头标题与说明由 DocPage 读注册表渲染。

export default function TableTextMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="tableTextMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {(['strong', 'body', 'weak', 'hint', 'success', 'danger'] as const).map((tone) => (
          <div key={tone} className="flex gap-2">
            <TableText tone={tone}>{t('dev.themeStates.tableName')}</TableText>
            <TableText tone={tone} muted>
              {t('dev.themeStates.tableName')}
            </TableText>
            <TableText tone={tone} mono>
              2026-09-05
            </TableText>
          </div>
        ))}
      </div>
    </section>
  );
}
