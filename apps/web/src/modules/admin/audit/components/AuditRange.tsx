import { useTranslation } from 'react-i18next';
import { DateRangePicker } from '@/components/pro/DateRangePicker';
import { localDateOf, localDayStartIso } from '@/lib/datetime';
import { defaultAuditRange } from '../model';

export function AuditRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const { t, i18n } = useTranslation('admin');
  // to 是结束日次日零点（开区间），回显时减 1 毫秒落回结束日
  const end = localDateOf(new Date(Date.parse(to) - 1).toISOString());

  return (
    <DateRangePicker
      size="toolbar"
      className="w-[calc(280px*var(--app-scale))]"
      aria-label={t('audit.rangeLabel')}
      locale={i18n.language}
      value={[localDateOf(from), end]}
      labels={{
        start: t('audit.from'),
        end: t('audit.to'),
        clear: t('audit.clear'),
        confirm: t('audit.apply'),
        presets: { last7: t('audit.last7'), last30: t('audit.last30') },
        days: (count) => t('audit.days', { count }),
      }}
      presets={['last7', 'last30']}
      onChange={(range) => {
        if (!range) {
          onChange(defaultAuditRange());
          return;
        }

        if (range[0] && range[1])
          onChange({ from: localDayStartIso(range[0]), to: localDayStartIso(range[1], 1) });
      }}
    />
  );
}
