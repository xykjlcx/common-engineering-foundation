import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import type { OperationDto } from '../api';
import { auditActionLabel, auditActionLabelKey, formatAuditTime, outcomeTone } from '../model';

interface OperationColumnActions {
  /** 点操作人：按该操作人筛选 */
  onFilterActor: (actorId: string | undefined) => void;
  /** 点操作：打开详情抽屉 */
  onOpenDetail: (id: string) => void;
}

export function operationColumns(
  t: TFunction<'admin'>,
  { onFilterActor, onOpenDetail }: OperationColumnActions,
): ColumnDef<OperationDto>[] {
  return [
    {
      id: 'createdAt',
      header: t('audit.time'),
      size: 195,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {formatAuditTime(row.original.createdAt)}
        </TableText>
      ),
    },
    {
      id: 'actor',
      header: t('audit.actor'),
      size: 150,
      cell: ({ row }) => (
        <Button
          variant="link"
          size="sm"
          className="max-w-full"
          onClick={() => onFilterActor(row.original.actorUserId ?? undefined)}
        >
          <span className="truncate" title={row.original.actorName}>
            {row.original.actorName}
          </span>
        </Button>
      ),
    },
    {
      id: 'module',
      header: t('audit.module'),
      size: 100,
      cell: ({ row }) => {
        const module = row.original.action.split('.')[0] ?? '';

        return (
          <TableText className="block">{t(`audit.modules.${module}`, { defaultValue: module })}</TableText>
        );
      },
    },
    {
      id: 'action',
      header: t('audit.action'),
      size: 230,
      cell: ({ row }) => (
        <Button variant="link" size="sm" className="max-w-full" onClick={() => onOpenDetail(row.original.id)}>
          <TableText
            className="block"
            mono={!auditActionLabelKey(row.original.action)}
            title={row.original.action}
          >
            {auditActionLabel(t, row.original.action)}
          </TableText>
        </Button>
      ),
    },
    {
      id: 'object',
      header: t('audit.object'),
      size: 205,
      cell: ({ row }) => (
        <TableText className="block" mono title={row.original.objectId ?? ''}>
          {row.original.objectType ?? '—'} · {row.original.objectId ?? '—'}
        </TableText>
      ),
    },
    {
      id: 'ip',
      header: t('audit.ip'),
      size: 135,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {row.original.ip ?? '—'}
        </TableText>
      ),
    },
    {
      id: 'outcome',
      header: t('audit.outcome'),
      size: 120,
      cell: ({ row }) => (
        <StatusBadge tone={outcomeTone(row.original.outcome)}>
          {t(`audit.outcomes.${row.original.outcome}`)}
        </StatusBadge>
      ),
    },
  ];
}
