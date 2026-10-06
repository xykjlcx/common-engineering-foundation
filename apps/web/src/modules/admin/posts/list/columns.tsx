import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import type { PostDto } from '../api';

export function postColumns(t: TFunction<'admin'>, onDetail: (id: string) => void): ColumnDef<PostDto>[] {
  return [
    {
      id: 'code',
      header: t('posts.columns.code'),
      size: 170,
      cell: ({ row }) => (
        <TableText mono className="block" title={row.original.code}>
          {row.original.code}
        </TableText>
      ),
    },
    {
      id: 'name',
      header: t('posts.columns.name'),
      size: 200,
      cell: ({ row }) => (
        <Button
          variant="link"
          size="sm"
          className="max-w-full"
          title={row.original.name}
          onClick={() => onDetail(row.original.id)}
        >
          <TableText tone="strong" className="block">
            {row.original.name}
          </TableText>
        </Button>
      ),
    },
    {
      id: 'roles',
      header: t('posts.defaultRoles'),
      size: 260,
      cell: ({ row }) => (
        <TableText className="block" title={row.original.roles.map((role) => role.name).join(', ')}>
          {row.original.roles.map((role) => role.name).join('、') || '—'}
        </TableText>
      ),
    },
    {
      id: 'sort',
      header: t('posts.sort'),
      size: 90,
      cell: ({ row }) => <TableText>{row.original.sort}</TableText>,
    },
    {
      id: 'enabled',
      header: t('posts.columns.enabled'),
      size: 120,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
          {t(row.original.enabled ? 'posts.status.enabled' : 'posts.status.disabled')}
        </StatusBadge>
      ),
    },
    {
      id: 'remark',
      header: t('posts.remark'),
      size: 240,
      cell: ({ row }) => (
        <TableText className="block" title={row.original.remark}>
          {row.original.remark}
        </TableText>
      ),
    },
  ];
}
