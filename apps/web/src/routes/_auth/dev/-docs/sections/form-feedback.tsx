import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/pro/FormErrorSummary';

// 表单反馈状态矩阵（FormErrorSummary + 字段级 FieldError 联动）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function FormFeedbackMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="formFeedbackMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.formFeedbackMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.formFeedbackNote')}</p>
      </div>
      <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
        <FormErrorSummary
          title={t('dev.themeStates.formSummaryTitle')}
          items={[
            {
              fieldId: 'crosscut-field-name',
              group: t('dev.themeStates.formSummaryGroupBasic'),
              label: t('dev.themeStates.formSummaryFieldName'),
              message: t('dev.themeStates.formSummaryFieldNameMsg'),
            },
            {
              fieldId: 'crosscut-field-code',
              group: t('dev.themeStates.formSummaryGroupBasic'),
              label: t('dev.themeStates.formSummaryFieldCode'),
              message: t('dev.themeStates.formSummaryFieldCodeMsg'),
            },
            {
              fieldId: 'crosscut-field-role',
              group: t('dev.themeStates.formSummaryGroupAccount'),
              label: t('dev.themeStates.formSummaryFieldRole'),
              message: t('dev.themeStates.formSummaryFieldRoleMsg'),
            },
          ]}
        />
        <FieldGroup>
          <Field data-invalid="true">
            <FieldLabel htmlFor="crosscut-field-name" required>
              {t('dev.themeStates.formFieldName')}
            </FieldLabel>
            <Input id="crosscut-field-name" aria-invalid defaultValue="" />
            <FieldError>{t('dev.themeStates.formFieldNameError')}</FieldError>
          </Field>
          <Field data-invalid="true">
            <FieldLabel htmlFor="crosscut-field-code" required>
              {t('dev.themeStates.formFieldCode')}
            </FieldLabel>
            <Input
              id="crosscut-field-code"
              aria-invalid
              defaultValue={t('dev.themeStates.formFieldCodeValue')}
            />
            <FieldError>{t('dev.themeStates.formFieldCodeError')}</FieldError>
          </Field>
        </FieldGroup>
      </div>
    </section>
  );
}
