import { useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { SelectControl } from '@/components/ui/select';

// 选择器族状态矩阵：原生 NativeSelect 与 Radix SelectControl 的闭合态。
// open / selected / disabled 三态的可截图载体在 sections/overlay.tsx（浮层内嵌 raw 预览）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function SelectMatrix(): JSX.Element {
  const { t } = useTranslation();
  const controlRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = touched && !value;
  const fieldSelectOptions = [
    { value: '', label: t('dev.themeStates.fieldSelectPlaceholder') },
    { value: 'rd', label: t('dev.themeStates.fieldResearch') },
    { value: 'ops', label: t('dev.themeStates.fieldOperations') },
  ];

  return (
    <section
      data-testid="selectMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.fieldSelect')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.fieldMatrixDesc')}</p>
      </div>
      <FieldGroup className="grid gap-4 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="theme-field-native-select">
            {t('dev.themeStates.fieldNativeSelect')}
          </FieldLabel>
          <NativeSelect id="theme-field-native-select" defaultValue="active">
            <option value="active">{t('dev.themeStates.fieldActive')}</option>
            <option value="disabled">{t('dev.themeStates.fieldInactive')}</option>
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="theme-field-select">{t('dev.themeStates.fieldSelect')}</FieldLabel>
          <SelectControl
            id="theme-field-select"
            ref={controlRef}
            onBlur={() => setTouched(true)}
            aria-invalid={!!invalid}
            aria-describedby={invalid ? 'theme-field-select-error' : undefined}
            value={value}
            options={fieldSelectOptions}
            placeholder={t('dev.themeStates.fieldSelectPlaceholder')}
            onValueChange={(next) => setValue(next)}
          />
          <FieldError id="theme-field-select-error">
            {invalid ? t('dev.themeStates.fieldInvalidDesc') : null}
          </FieldError>
        </Field>
      </FieldGroup>
    </section>
  );
}
