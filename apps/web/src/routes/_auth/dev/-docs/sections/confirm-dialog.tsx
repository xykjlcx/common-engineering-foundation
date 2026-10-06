import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, type ConfirmSeverity } from '@/components/pro/ConfirmDialog';

// 确认弹窗状态矩阵：三档 severity / 异步提交锁 / 失败保留输入 / 重试后关闭。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function ConfirmDialogMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [openConfirm, setOpenConfirm] = useState<ConfirmSeverity | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const confirmAsync = async () => {
    setFailed(false);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!attempted) {
      setAttempted(true);
      setFailed(true);
      throw new Error('demo submission failure');
    }
    setOpenConfirm(null);
  };

  return (
    <section
      data-testid="confirmDialogMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.confirmSeverityMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.confirmSeverityNote')}</p>
      </div>
      <div data-testid="confirmSeverityMatrix" className="rounded-md border border-border bg-surface-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOpenConfirm('reversible')}>
            {t('dev.themeStates.confirmReversibleTrigger')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpenConfirm('impact')}>
            {t('dev.themeStates.confirmImpactTrigger')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setAttempted(false);
              setOpenConfirm('irreversible');
            }}
          >
            {t('dev.themeStates.confirmIrreversibleTrigger')}
          </Button>
        </div>
        <ConfirmDialog
          open={openConfirm === 'reversible'}
          severity="reversible"
          title={t('dev.themeStates.confirmReversibleTitle')}
          description={t('dev.themeStates.confirmReversibleDesc')}
          cancelText={t('dev.themeStates.confirmReversibleCancel')}
          confirmText={t('dev.themeStates.confirmReversibleConfirm')}
          onOpenChange={(next) => setOpenConfirm(next ? 'reversible' : null)}
          onConfirm={() => setOpenConfirm(null)}
        />
        <ConfirmDialog
          open={openConfirm === 'impact'}
          severity="impact"
          title={t('dev.themeStates.confirmImpactTitle')}
          description={t('dev.themeStates.confirmImpactDesc')}
          cancelText={t('dev.themeStates.confirmCancel')}
          confirmText={t('dev.themeStates.confirmImpactConfirm')}
          onOpenChange={(next) => setOpenConfirm(next ? 'impact' : null)}
          onConfirm={() => setOpenConfirm(null)}
        />
        <ConfirmDialog
          open={openConfirm === 'irreversible'}
          error={failed ? t('dev.themeStates.dataTableError') : undefined}
          severity="irreversible"
          title={t('dev.themeStates.confirmIrreversibleTitle')}
          description={t('dev.themeStates.confirmIrreversibleDesc')}
          cancelText={t('dev.themeStates.confirmCancel')}
          confirmText={t('dev.themeStates.confirmIrreversibleConfirm')}
          confirmation={{
            label: t('dev.themeStates.confirmIrreversibleLabel'),
            expected: t('dev.themeStates.confirmIrreversibleExpected'),
            placeholder: t('dev.themeStates.confirmIrreversibleExpected'),
          }}
          onOpenChange={(next) => setOpenConfirm(next ? 'irreversible' : null)}
          onConfirm={confirmAsync}
        />
      </div>
    </section>
  );
}
