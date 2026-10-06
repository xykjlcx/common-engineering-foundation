import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ToastSurface } from '@/components/ui/toast';

// 轻提示状态矩阵（ToastSurface success / error / warning / undo 四态）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function ToastMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="toastMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.toastMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.toastNote')}</p>
      </div>
      <div className="grid gap-2.5">
        <ToastSurface tone="success" message={t('dev.themeStates.toastSuccess')} />
        <ToastSurface
          tone="error"
          message={t('dev.themeStates.toastError')}
          action={
            <span className="shrink-0 text-xs font-medium">{t('dev.themeStates.toastErrorAction')}</span>
          }
        />
        <ToastSurface
          tone="warning"
          message={t('dev.themeStates.toastWarning')}
          action={
            <span className="shrink-0 text-xs font-medium">{t('dev.themeStates.toastWarningAction')}</span>
          }
        />
        <ToastSurface
          tone="undo"
          message={t('dev.themeStates.toastUndo')}
          action={
            <span className="shrink-0 text-xs font-medium">{t('dev.themeStates.toastUndoAction')}</span>
          }
        />
      </div>
    </section>
  );
}
