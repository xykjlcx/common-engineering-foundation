import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldValue,
  FieldRequiredHint,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchField } from '@/components/pro/SearchField';

// 输入框族状态矩阵（Field 族基准件）：默认 / 校验失败 / 禁用 / 只读 / addon / 搜索 / 多行。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。
// 下拉两格（NativeSelect / SelectControl）拆到 sections/select.tsx。

export default function InputMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="inputMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.fieldMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.fieldMatrixDesc')}</p>
      </div>
      <div data-testid="fieldHintMatrix" className="mb-4 grid gap-2">
        <FieldRequiredHint
          before={t('dev.themeStates.fieldDefault')}
          after={t('dev.themeStates.fieldDefaultDesc')}
        />
        {(['default', 'compact', 'body'] as const).map((size) => (
          <FieldDescription key={size} size={size}>
            {t('dev.themeStates.fieldReadonly')}
          </FieldDescription>
        ))}
      </div>
      <FieldGroup data-testid="fieldValidationAlignmentMatrix" className="mb-4 grid gap-4 md:grid-cols-3">
        <Field data-invalid="true">
          <FieldLabel required htmlFor="field-alignment-invalid">
            {t('dev.themeStates.fieldInvalid')}
          </FieldLabel>
          <Input id="field-alignment-invalid" aria-invalid aria-describedby="field-alignment-error" />
          <FieldError id="field-alignment-error">{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
        </Field>
        <Field>
          <FieldLabel required htmlFor="field-alignment-required">
            {t('dev.themeStates.fieldDefault')}
          </FieldLabel>
          <Input id="field-alignment-required" />
        </Field>
        <Field>
          <FieldLabel htmlFor="field-alignment-optional">{t('dev.themeStates.fieldReadonly')}</FieldLabel>
          <Input id="field-alignment-optional" readOnly />
        </Field>
      </FieldGroup>
      <FieldGroup data-testid="formTypographyMatrix" className="mb-4 grid gap-4 md:grid-cols-3">
        <Field>
          <FieldLabel presentation="form" required htmlFor="theme-form-input">
            {t('dev.themeStates.fieldDefault')}
          </FieldLabel>
          <Input id="theme-form-input" inputSize="form" mono defaultValue="EMP-001" />
        </Field>
        <Field>
          <FieldLabel presentation="hint" htmlFor="theme-form-addon">
            {t('dev.themeStates.fieldAddon')}
          </FieldLabel>
          <Input id="theme-form-addon" inputSize="form" mono addonBefore="ID" defaultValue="0001" />
        </Field>
        <Field>
          <FieldLabel presentation="form">{t('dev.themeStates.fieldReadonly')}</FieldLabel>
          <FieldValue mono>EMP-001</FieldValue>
          <FieldValue>{t('dev.themeStates.fieldReadonlyValue')}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup className="grid gap-4 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="theme-field-default">{t('dev.themeStates.fieldDefault')}</FieldLabel>
          <Input id="theme-field-default" placeholder={t('dev.themeStates.focusPlaceholder')} />
          <FieldDescription>{t('dev.themeStates.fieldDefaultDesc')}</FieldDescription>
        </Field>

        <Field data-invalid>
          <FieldLabel htmlFor="theme-field-invalid">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
          <Input id="theme-field-invalid" aria-invalid defaultValue="abc" />
          <FieldError>{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
        </Field>

        <Field data-disabled>
          <FieldLabel htmlFor="theme-field-disabled">{t('dev.themeStates.fieldDisabled')}</FieldLabel>
          <Input
            id="theme-field-disabled"
            disabled
            defaultValue={t('dev.themeStates.fieldDisabledValue')}
            readOnly
          />
          <FieldDescription>{t('dev.themeStates.fieldDisabledDesc')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="theme-field-readonly">{t('dev.themeStates.fieldReadonly')}</FieldLabel>
          <Input id="theme-field-readonly" readOnly defaultValue={t('dev.themeStates.fieldReadonlyValue')} />
        </Field>

        <Field>
          <FieldLabel htmlFor="theme-field-addon">{t('dev.themeStates.fieldAddon')}</FieldLabel>
          <Input id="theme-field-addon" addonBefore="https://" defaultValue="acme.com" />
        </Field>

        <Field>
          <FieldLabel htmlFor="theme-field-search">{t('dev.themeStates.fieldSearch')}</FieldLabel>
          <SearchField id="theme-field-search" placeholder={t('dev.themeStates.fieldSearchPlaceholder')} />
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel htmlFor="theme-field-textarea">{t('dev.themeStates.fieldTextarea')}</FieldLabel>
          <Textarea id="theme-field-textarea" placeholder={t('dev.themeStates.fieldTextareaPlaceholder')} />
        </Field>
      </FieldGroup>
    </section>
  );
}
