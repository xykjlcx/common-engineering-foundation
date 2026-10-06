import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';
import { noticeDetailQuery } from '../api';
import { NoticeForm } from '../form/NoticeForm';
export interface NoticeEditorProps {
  id?: string;
  permissions: string[];
  systemAdmin?: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}
export function NoticeEditor(props: NoticeEditorProps) {
  const { t } = useTranslation('admin');
  const result = useQuery({ ...noticeDetailQuery(props.id ?? ''), enabled: !!props.id });
  return (
    <>
      {props.id ? (
        <QueryState
          className="flex min-h-0 flex-1 flex-col [&>[data-slot=query-state-content]]:contents"
          data={result.data}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('messages.loading')}
          errorLabel={t('notices.loadFailed')}
          retryLabel={t('messages.retry')}
          onRetry={() => void result.refetch()}
        >
          {(notice) => <NoticeForm {...props} initial={notice} />}
        </QueryState>
      ) : (
        <NoticeForm {...props} />
      )}
    </>
  );
}
