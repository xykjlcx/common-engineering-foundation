import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DetailSection } from '@/components/pro/page-scaffold';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { UserImportDialog } from '../../users';
import { auditSearchSchema } from '../../audit/model';
import { matchPermission } from '@/lib/permission';
import { menusQuery, overviewQuery, dashboardKeys } from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardEntries, unassignedUsersFilters } from '../model';
import type { DashboardPageProps } from '../types';

export function DashboardActions({ identity, onNavigate }: DashboardPageProps) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const client = useQueryClient();
  const [importing, setImporting] = useState(false);
  const navigation = useQuery(menusQuery('admin'));
  const { data } = useQuery(overviewQuery(identity));
  const accessible = (path: string) =>
    dashboardEntries(navigation.data ?? []).some((entry) => entry.path === path);
  const permitted = (code: string) => matchPermission(identity, code);
  const attention = data?.attention;
  const total = Object.values(attention ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
  const rows = [
    {
      key: 'lockedAccounts',
      count: attention?.lockedAccounts,
      visible: accessible('/admin/audit') && permitted('sys:audit:view') && permitted('audit:log:view'),
      onClick: () => {
        const to = data?.generatedAt ?? new Date().toISOString();
        void navigate({
          to: '/admin/audit',
          search: auditSearchSchema.parse({
            tab: 'login',
            login: {
              outcome: 'locked',
              from: new Date(Date.parse(to) - 86400000).toISOString(),
              to,
              page: 1,
              pageSize: 15,
            },
          }),
        });
      },
    },
    {
      key: 'usersWithoutRole',
      count: attention?.usersWithoutRole,
      visible: accessible('/admin/users') && permitted('iam:user:view'),
      onClick: () =>
        void navigate({
          to: '/admin/users',
          search: { page: 1, pageSize: 15, keyword: '', filters: unassignedUsersFilters },
        }),
    },
    {
      key: 'deptsWithoutLeader',
      count: attention?.deptsWithoutLeader,
      visible: accessible('/admin/depts') && permitted('iam:dept:view'),
      onClick: () => onNavigate('/admin/depts'),
    },
  ];
  const entries = [
    {
      label: 'newUser',
      visible: accessible('/admin/users') && permitted('iam:user:create'),
      onClick: () => onNavigate('/admin/users/new'),
    },
    {
      label: 'importUsers',
      visible: accessible('/admin/users') && permitted('iam:user:import'),
      onClick: () => setImporting(true),
    },
    {
      label: 'roles',
      visible: accessible('/admin/roles') && permitted('iam:role:view'),
      onClick: () => onNavigate('/admin/roles'),
    },
    {
      label: 'audit',
      visible: accessible('/admin/audit') && permitted('sys:audit:view'),
      onClick: () => onNavigate('/admin/audit'),
    },
  ].filter((entry) => entry.visible);
  return (
    <div className="grid min-w-0 gap-4">
      {attention && (
        <DetailSection
          title={t('dashboard.overview.attention')}
          actions={<StatusBadge tone="warning">{total}</StatusBadge>}
        >
          <div className="grid gap-3">
            {rows
              .filter((row) => row.count)
              .map((row) => (
                <div key={row.key} className="flex items-center gap-3 py-2">
                  <TableText className="flex-1">{t(`dashboard.overview.${row.key}`)}</TableText>
                  <TableText tone="strong">{row.count}</TableText>
                  {row.visible && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={t('dashboard.overview.viewItem', {
                        item: t(`dashboard.overview.${row.key}`),
                      })}
                      onClick={row.onClick}
                    >
                      {t('dashboard.overview.view')}
                    </Button>
                  )}
                </div>
              ))}
            {!total && <TableText tone="weak">{t('dashboard.overview.noAttention')}</TableText>}
          </div>
        </DetailSection>
      )}
      {entries.length > 0 && (
        <DetailSection title={t('dashboard.overview.shortcuts')}>
          <div className="grid grid-cols-2 gap-2">
            {entries.map((entry) => (
              <Button key={entry.label} variant="outline" onClick={entry.onClick}>
                {t(`dashboard.overview.${entry.label}`)}
              </Button>
            ))}
          </div>
        </DetailSection>
      )}
      {!entries.length && !attention && <TableText tone="weak">{t('dashboard.live.emptyHint')}</TableText>}
      {importing && (
        <UserImportDialog
          open
          canImport={accessible('/admin/users') && permitted('iam:user:import')}
          onOpenChange={(open) => {
            setImporting(open);
            if (!open) void client.invalidateQueries({ queryKey: dashboardKeys.all });
          }}
        />
      )}
    </div>
  );
}
