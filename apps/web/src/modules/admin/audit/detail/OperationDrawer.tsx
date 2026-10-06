import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FieldValue, FieldDescription } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { QueryState } from '@/components/pro/QueryState';
import { operationQuery } from '../api';
import { auditActionLabel, auditDiff, auditError, formatAuditTime, outcomeTone } from '../model';

export function OperationDrawer({
  id,
  onClose,
  onOpenRelated,
}: {
  id: string;
  onClose: () => void;
  onOpenRelated: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  const result = useQuery(operationQuery(id));

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="w-[calc(400px*var(--app-scale))] sm:max-w-[calc(400px*var(--app-scale))]"
        showCloseButton={false}
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>{t('audit.detail')}</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('audit.close')}
            </Button>
          </div>
          <SheetDescription>{t('audit.detailHint')}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <QueryState
            data={result.data}
            pending={result.isPending}
            error={result.isError}
            loadingLabel={t('audit.loading')}
            errorLabel={auditError(result.error, t('audit.loadFailed'))}
            retryLabel={t('audit.retry')}
            onRetry={() => void result.refetch()}
          >
            {(entry) => (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <TableText className="whitespace-normal break-all" title={entry.action}>
                    {auditActionLabel(t, entry.action)}
                  </TableText>
                  <StatusBadge tone={outcomeTone(entry.outcome)}>
                    {t(`audit.outcomes.${entry.outcome}`)}
                  </StatusBadge>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  {[
                    [t('audit.actor'), entry.actorName],
                    [t('audit.time'), formatAuditTime(entry.createdAt)],
                    [
                      t('audit.object'),
                      [entry.objectType, entry.objectId].filter(Boolean).join(' · ') || '—',
                    ],
                    [t('audit.ip'), entry.ip ?? '—'],
                    [t('audit.traceId'), entry.traceId ?? '—'],
                    [t('audit.errorCode'), entry.errorCode ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt>
                        <FieldDescription>{label}</FieldDescription>
                      </dt>
                      <dd>
                        <FieldValue className="break-all">{value}</FieldValue>
                      </dd>
                    </div>
                  ))}
                </dl>
                <Separator />
                <TableText tone="strong">{t('audit.changes')}</TableText>
                {auditDiff(entry.before, entry.after).length ? (
                  <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                    <TableText>{t('audit.field')}</TableText>
                    <TableText>{t('audit.before')}</TableText>
                    <TableText>{t('audit.after')}</TableText>
                    {auditDiff(entry.before, entry.after).map((diff) => (
                      <div key={diff.key} className="contents">
                        <TableText mono className="whitespace-normal break-all">
                          {diff.key}
                        </TableText>
                        <TableText
                          mono
                          tone={diff.changed ? 'danger' : 'body'}
                          className="whitespace-pre-wrap break-all"
                        >
                          {diff.before}
                        </TableText>
                        <TableText
                          mono
                          tone={diff.changed ? 'success' : 'body'}
                          className="whitespace-pre-wrap break-all"
                        >
                          {diff.after}
                        </TableText>
                      </div>
                    ))}
                  </div>
                ) : (
                  <FieldDescription>{t('audit.noValues')}</FieldDescription>
                )}
                <Separator />
                <TableText tone="strong">{t('audit.related', { count: entry.related.length })}</TableText>
                {entry.related.length ? (
                  entry.related.map((row) => (
                    <Button
                      key={row.id}
                      variant="link"
                      className="justify-start"
                      onClick={() => onOpenRelated(row.id)}
                    >
                      <TableText mono title={row.objectId ?? ''}>
                        {auditActionLabel(t, row.action)} · {row.objectId ?? '—'}
                      </TableText>
                    </Button>
                  ))
                ) : (
                  <FieldDescription>{t('audit.noRelated')}</FieldDescription>
                )}
              </div>
            )}
          </QueryState>
        </div>
      </SheetContent>
    </Sheet>
  );
}
