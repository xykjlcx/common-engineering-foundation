import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/pro/DateRangePicker';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { emptyLogFilters, type LogFilters } from '../model';

export function LogFilterBar({
  statuses,
  filters,
  onChange,
}: {
  statuses: { value: string; label: string }[];
  filters: LogFilters;
  onChange: (next: LogFilters) => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const active = filters.status !== 'all' || filters.range !== null;
  return (
    <>
      <FilterSelect
        label={t('users.logs.filters.result')}
        value={filters.status}
        options={[{ value: 'all', label: t('users.logs.filters.all') }, ...statuses]}
        onValueChange={(status) => onChange({ ...filters, status })}
      />
      <DateRangePicker
        size="toolbar"
        className="w-[calc(280px*var(--app-scale))]"
        aria-label={t('users.logs.filters.rangeLabel')}
        locale={i18n.language}
        value={filters.range}
        labels={{
          start: t('users.logs.filters.from'),
          end: t('users.logs.filters.to'),
          clear: t('users.logs.filters.clear'),
          confirm: t('users.logs.filters.apply'),
          presets: {
            today: t('users.logs.filters.today'),
            last7: t('users.logs.filters.last7'),
            last30: t('users.logs.filters.last30'),
            thisMonth: t('users.logs.filters.thisMonth'),
          },
          days: (count) => t('users.logs.filters.days', { count }),
        }}
        presets={['today', 'last7', 'last30', 'thisMonth']}
        onChange={(range) => onChange({ ...filters, range })}
      />
      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange(emptyLogFilters)}>
          {t('users.logs.filters.reset')}
        </Button>
      )}
    </>
  );
}
