import type { z } from 'zod';
import type { DeptChangePreviewSchema } from '@keel/core/dept-contract';
import { useTranslation } from 'react-i18next';
import { TableText } from '@/components/pro/TableText';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { Checkbox } from '@/components/ui/checkbox';

export type DeptImpactPreview = z.infer<typeof DeptChangePreviewSchema>;
export function DeptImpact({
  preview,
  acknowledged,
  onAcknowledge,
}: {
  preview: DeptImpactPreview;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  return (
    <div className="grid gap-3" aria-live="polite">
      <TableText tone="strong">{t('depts.org.previewTitle')}</TableText>
      <DescriptionList
        items={[
          { label: t('depts.org.companyOf'), value: preview.companyName ?? t('depts.org.unassigned') },
          { label: t('depts.org.subtreeMembers'), value: preview.memberCount },
          { label: t('depts.children'), value: preview.descendantCount },
        ]}
      />
      {preview.companyChanges.map((change) => (
        <div key={change.nodeId} className="grid gap-1">
          <TableText>{change.name}</TableText>
          <TableText tone="hint" className="whitespace-normal">
            {change.fromCompanyName ?? t('depts.org.unassigned')} →{' '}
            {change.toCompanyName ?? t('depts.org.unassigned')} ·{' '}
            {t('depts.memberCount', { count: change.memberCount })}
          </TableText>
        </div>
      ))}
      <TableText tone="hint" className="whitespace-normal">
        {preview.companyChanges.length
          ? t('depts.org.affected', { count: preview.affectedMemberCount })
          : t('depts.org.unchangedCompany')}
      </TableText>
      <TableText tone="hint" className="whitespace-normal">
        {t('depts.org.scopeHint')}
      </TableText>
      {preview.affectedMemberCount > 0 && (
        <label className="flex items-start gap-2">
          <Checkbox checked={acknowledged} onCheckedChange={onAcknowledge} />
          <TableText>{t('depts.org.acknowledge')}</TableText>
        </label>
      )}
    </div>
  );
}
