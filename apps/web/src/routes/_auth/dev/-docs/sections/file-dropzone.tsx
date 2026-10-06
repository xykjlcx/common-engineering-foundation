import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDropzone } from '@/components/pro/FileDropzone';

// 文件拖放区状态矩阵（FileDropzone：默认 / 禁用）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function FileDropzoneMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="fileDropzoneMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.fileDropzoneMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.fileDropzoneHint')}</p>
      </div>
      <div className="grid gap-3">
        <FileDropzone
          label={t('dev.themeStates.fileDropzoneLabel')}
          hint={t('dev.themeStates.fileDropzoneHint')}
          inputLabel={t('dev.themeStates.fileDropzoneInput')}
          files={[]}
          onFiles={() => undefined}
        />
        <FileDropzone
          label={t('dev.themeStates.fileDropzoneLabel')}
          hint={t('dev.themeStates.fileDropzoneHint')}
          inputLabel={t('dev.themeStates.fileDropzoneDisabled')}
          files={[]}
          disabled
          onFiles={() => undefined}
        />
      </div>
    </section>
  );
}
