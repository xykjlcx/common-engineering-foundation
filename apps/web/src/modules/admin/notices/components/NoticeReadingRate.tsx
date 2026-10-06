import { useTranslation } from 'react-i18next';
import { ProgressBar } from '@/components/ui/progress';
import { TableText } from '@/components/pro/TableText';
import { readingRate } from '../model';
export function NoticeReadingRate({
  readCount,
  recipientCount,
  confirmedCount,
  requireConfirmation,
}: {
  readCount: number;
  recipientCount: number;
  confirmedCount: number;
  requireConfirmation: boolean;
}) {
  const { t } = useTranslation('admin');
  const percent = readingRate(readCount, recipientCount);
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      title={
        t('notices.readingDetails', { read: readCount, total: recipientCount }) +
        (requireConfirmation ? ` · ${t('notices.confirmedCount', { count: confirmedCount })}` : '')
      }
    >
      <ProgressBar
        aria-label={t('notices.fields.reading')}
        className="h-[calc(5px*var(--app-scale))] min-w-0 flex-1"
        value={percent}
      />
      <TableText tone="hint" mono className="w-[calc(34px*var(--app-scale))] shrink-0">
        {percent}%
      </TableText>
    </div>
  );
}
