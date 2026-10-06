import { useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';

// 查询态矩阵：首次加载 / 首次失败 / 旧数据刷新失败 / 重试中 / 恢复。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function QueryStateMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [refreshState, setRefreshState] = useState<'error' | 'refreshing' | 'ready'>('error');
  const retry = async () => {
    setRefreshState('refreshing');
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshState('ready');
  };

  return (
    <section
      data-testid="queryStateMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.queryStateMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('dev.themeStates.queryStateMatrix')}</p>
          <QueryState
            data={undefined}
            pending
            error={false}
            loadingLabel={t('dev.themeStates.dataTableLoading')}
            errorLabel={t('dev.themeStates.dataTableError')}
            retryLabel={t('errors.retry')}
            onRetry={() => undefined}
            className="min-h-32"
          >
            {() => null}
          </QueryState>
        </div>
        <QueryState
          data={undefined}
          pending={false}
          error
          loadingLabel={t('dev.themeStates.dataTableLoading')}
          errorLabel={t('dev.themeStates.dataTableError')}
          retryLabel={t('errors.retry')}
          onRetry={() => undefined}
          className="min-h-32"
        >
          {() => null}
        </QueryState>
        <div data-demo-state={refreshState}>
          <QueryState
            data={t('dev.themeStates.treeNodes.rd')}
            pending={false}
            refreshing={refreshState === 'refreshing'}
            error={refreshState !== 'ready'}
            loadingLabel={t('dev.themeStates.dataTableLoading')}
            errorLabel={t('dev.themeStates.dataTableError')}
            retryLabel={t('errors.retry')}
            onRetry={() => {
              void retry();
            }}
          >
            {(data) => <p>{data}</p>}
          </QueryState>
          {refreshState === 'ready' && (
            <Button size="sm" variant="secondary" onClick={() => setRefreshState('error')}>
              {t('dev.themeStates.dataTableError')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
