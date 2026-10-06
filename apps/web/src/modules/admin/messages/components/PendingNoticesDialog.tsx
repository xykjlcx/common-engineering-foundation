import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/pro/MarkdownContent';
import { FieldError } from '@/components/ui/field';
import { pendingNoticesQuery, useMessageMutations } from '../api';
export function PendingNoticesDialog() {
  const { t } = useTranslation('admin');
  const query = useQuery(pendingNoticesQuery);
  const { confirm } = useMessageMutations();
  const notice = query.data?.[0];
  if (!notice) return null;
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle>{notice.title}</DialogTitle>
        <DialogDescription>
          {t('messages.pendingDescription', { count: query.data?.length ?? 0 })}
        </DialogDescription>
        <MarkdownContent className="max-h-96 overflow-y-auto" content={notice.content} />
        <FieldError>{confirm.isError ? t('messages.actionFailed') : null}</FieldError>
        <DialogFooter>
          <Button loading={confirm.isPending} onClick={() => confirm.mutate({ id: notice.id })}>
            {t('messages.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
