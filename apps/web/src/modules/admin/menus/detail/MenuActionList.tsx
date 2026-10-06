import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { PageSection } from '@/components/pro/page-scaffold';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { lv } from '@/lib/localized';
import type { MenuCapabilities } from '../types';
import type { MenuRecord } from '@/modules/types';

interface MenuActionListProps {
  menu: MenuRecord;
  actions: MenuRecord[];
  locale: string;
  t: TFunction<'admin'>;
  capabilities: MenuCapabilities;
  onCreate: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

export function MenuActionList({
  menu,
  actions,
  locale,
  t,
  capabilities,
  onCreate,
  onEdit,
  onDelete,
  onSetVisibility,
}: MenuActionListProps) {
  if (menu.type !== 'menu') return null;
  const columns: ColumnDef<MenuRecord>[] = [
    {
      id: 'permission',
      header: t('menus.columns.permission'),
      size: 240,
      cell: ({ row }) => (
        <TableText mono>{row.original.permission || t('menus.inspector.emptyValue')}</TableText>
      ),
    },
    {
      id: 'name',
      header: t('menus.columns.name'),
      size: 140,
      cell: ({ row }) => <TableText>{lv(row.original.label, locale)}</TableText>,
    },
    {
      id: 'visible',
      header: t('menus.columns.visible'),
      size: 110,
      cell: ({ row }) =>
        capabilities.toggle ? (
          <Switch
            size="sm"
            aria-label={t('menus.actions.toggleVisible', { name: lv(row.original.label, locale) })}
            checked={row.original.visible}
            onCheckedChange={(visible) => onSetVisibility(row.original.id, visible)}
          />
        ) : (
          <StatusBadge tone={row.original.visible ? 'success' : 'neutral'}>
            {t(row.original.visible ? 'menus.inspector.visible' : 'menus.inspector.hidden')}
          </StatusBadge>
        ),
    },
    ...(capabilities.update || capabilities.delete
      ? [
          {
            id: 'actions',
            header: t('menus.columns.actions'),
            size: 120,
            cell: ({ row }: { row: { original: MenuRecord } }) => (
              <div className="flex gap-2">
                {capabilities.update && (
                  <Button
                    variant="text"
                    size="xs"
                    aria-label={t('menus.actions.editName', { name: lv(row.original.label, locale) })}
                    onClick={() => onEdit(row.original)}
                  >
                    {t('menus.actions.edit')}
                  </Button>
                )}
                {capabilities.delete && (
                  <Button
                    variant="danger-ghost"
                    size="xs"
                    aria-label={t('menus.actions.deleteName', { name: lv(row.original.label, locale) })}
                    onClick={() => onDelete(row.original)}
                  >
                    {t('menus.actions.delete')}
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <PageSection
      aria-label={t('menus.actionSection.label')}
      data-testid="menu-actions-card"
      variant="card"
      title={t('menus.actionSection.title')}
      description={t('menus.actionSection.desc', { count: actions.length })}
      actions={
        capabilities.create ? (
          <Button size="sm" variant="outline" onClick={() => onCreate(menu)}>
            <Plus data-icon="inline-start" />
            {t('menus.actions.createAction')}
          </Button>
        ) : undefined
      }
    >
      <div data-testid="menu-action-list" className="mt-3 grid">
        <DataTable
          columns={columns}
          data={actions}
          rowKey={(action) => action.id}
          density="default"
          emptyText={t('menus.actionSection.empty')}
          loadingText={t('menus.loading')}
        />
      </div>
    </PageSection>
  );
}
