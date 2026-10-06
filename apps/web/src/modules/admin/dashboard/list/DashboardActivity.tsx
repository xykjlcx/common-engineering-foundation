import { matchPermission } from '@/lib/permission';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DetailSection } from '@/components/pro/page-scaffold';
import { LineChart } from '@/components/pro/LineChart';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { auditActionLabel, outcomeTone, formatAuditTime } from '../../audit/model';
import { overviewQuery, menusQuery } from '../api';
import { dashboardEntries } from '../model';
import type { DashboardPageProps } from '../types';

export function DashboardActivity({ identity, onNavigate }: DashboardPageProps) {
  const { t } = useTranslation('admin');
  const { data } = useQuery(overviewQuery(identity));
  const navigation = useQuery(menusQuery('admin'));
  const canAudit =
    matchPermission(identity, 'audit:log:view') &&
    matchPermission(identity, 'sys:audit:view') &&
    dashboardEntries(navigation.data ?? []).some((entry) => entry.path === '/admin/audit');
  return (
    <div className="grid min-w-0 gap-4">
      {data?.trend && (
        <DetailSection
          title={t('dashboard.overview.trend')}
          actions={<TableText tone="hint">{t('dashboard.overview.localDays')}</TableText>}
        >
          <LineChart
            label={t('dashboard.overview.trend')}
            emptyLabel={t('dashboard.overview.noChanges')}
            labels={data.trend.map((point) => point.date.slice(5))}
            series={[
              {
                label: t('dashboard.overview.successLogins'),
                values: data.trend.map((point) => point.logins),
              },
              { label: t('dashboard.overview.changes'), values: data.trend.map((point) => point.changes) },
            ]}
          />
        </DetailSection>
      )}
      {data?.recentChanges && (
        <DetailSection
          title={t('dashboard.overview.recent')}
          actions={
            canAudit ? (
              <Button variant="link" size="sm" onClick={() => onNavigate('/admin/audit')}>
                {t('dashboard.overview.viewAudit')}
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-1">
            {data.recentChanges.map((row) => (
              <div key={row.id} className="flex min-w-0 items-center gap-3 py-2">
                <TableText tone="strong" className="w-24 shrink-0">
                  {row.actorName}
                </TableText>
                <TableText className="flex-1">
                  {auditActionLabel(t, row.action)}
                  {row.objectType
                    ? ` · ${t(`audit.modules.${row.objectType}`, { defaultValue: row.objectType })}`
                    : ''}
                </TableText>
                <StatusBadge tone={outcomeTone(row.outcome)}>
                  {t(`audit.outcomes.${row.outcome}`)}
                </StatusBadge>
                <TableText tone="hint" title={formatAuditTime(row.createdAt)}>
                  {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableText>
              </div>
            ))}
            {!data.recentChanges.length && (
              <TableText tone="weak">{t('dashboard.overview.noChanges')}</TableText>
            )}
          </div>
        </DetailSection>
      )}
    </div>
  );
}
