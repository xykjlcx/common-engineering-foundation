import { PasswordPolicyHint } from '@/modules/admin/settings';
import { UserManagerField } from './UserManagerField';
import { createContext, useContext, useId, useMemo, useState, type JSX, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Controller,
  useController,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
} from 'react-hook-form';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChipsField } from '@/components/pro/ChipsField';
import { SegmentedControl } from '@/components/pro/SegmentedControl';
import { DatePicker, type DatePickerPreset } from '@/components/pro/DatePicker';
import { PickerPopover, type PickerNode } from '@/components/pro/PickerPopover';
import { formatIsoDate } from '@/components/ui/calendar';
import { PageDivider, PageSectionHeading } from '@/components/pro/page-scaffold';
import { Field, FieldError, FieldLabel, FieldValue } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  userPostsQuery,
  userDeptTreeQuery as deptTreeQuery,
  userRolesQuery as rolesQuery,
} from '../api/dictionaries';
import { UserAvatarField } from './UserAvatarField';
import { type UserFormInput } from '../api';
import type { UserFormMode } from '../types';

const gridClass =
  'grid grid-cols-1 gap-x-[calc(28px*var(--app-scale))] gap-y-[calc(16px*var(--app-scale))] md:grid-cols-2 xl:grid-cols-3';
/** 编辑页才标注「已改动」字段；新建页里填过的值不算改动。 */
const MarkChangesContext = createContext(false);
const sectionBodyGap = 'mb-[calc(14px*var(--app-scale))]';

export interface UserFormFieldsProps {
  mode: UserFormMode;
  canAssignRoles?: boolean;
  control: Control<UserFormInput>;
  initialPassword: string;
  accountEnabled?: boolean;
  onAvatarUploadingChange: (uploading: boolean) => void;
  onRegeneratePassword: () => void;
}

export function UserFormFields({
  mode,
  canAssignRoles = false,
  control,
  initialPassword,
  accountEnabled = true,
  onAvatarUploadingChange,
  onRegeneratePassword,
}: UserFormFieldsProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const postChoices = useQuery(userPostsQuery);
  const posts = postChoices.data ?? [];
  const roleField = useController({ control, name: 'roleIds' }).field;
  const [rolesManuallyChanged, markRolesChanged] = useState(false);
  const [suggestedPost, suggestPost] = useState<string | null>(null);
  const suggestion = posts.find((post) => post.id === suggestedPost);
  const choosePost = (id: string | null) => {
    if (mode !== 'create' || !canAssignRoles) return;
    const selected = posts.find((post) => post.id === id);
    if (rolesManuallyChanged) suggestPost(id);
    else {
      roleField.onChange(selected?.roleIds ?? []);
      suggestPost(null);
    }
  };
  const { data: roles = [] } = useQuery(rolesQuery);
  const deptNodes = useMemo<PickerNode[]>(
    () =>
      depts.map((dept) => ({
        value: dept.id,
        label: dept.name,
        parentValue: dept.parentId,
      })),
    [depts],
  );
  const roleNodes = useMemo<PickerNode[]>(
    () =>
      roles.map((role) => ({
        value: role.id,
        label: role.name,
        meta: role.type === 'system' ? t('users.form.systemRole') : undefined,
      })),
    [roles, t],
  );
  const pickerLabels = {
    searchPlaceholder: t('users.filters.deptSearchPlaceholder'),
    frequent: t('users.filters.frequent'),
    empty: t('users.filters.noMatch'),
    matchHint: (query: string, count: number) => t('users.filters.matchHint', { query, count }),
    hints: [t('users.filters.hintMove'), t('users.filters.hintConfirm'), t('users.filters.hintClose')],
  };
  const chipsLabels = {
    ...pickerLabels,
    add: t('users.form.addChip'),
    remove: (label: string) => t('users.form.removeChip', { label }),
    more: (count: number) => t('users.rolesMore', { count }),
  };

  return (
    <MarkChangesContext.Provider value={mode === 'edit'}>
      <section
        data-slot="user-form-section"
        className="px-[calc(24px*var(--app-scale))] pt-[calc(16px*var(--app-scale))] pb-[calc(14px*var(--app-scale))]"
      >
        <PageSectionHeading
          title={t('users.form.sections.basic')}
          description={t('users.form.sections.basicDesc')}
          className="mb-[calc(13px*var(--app-scale))]"
        />
        <div className={cn(gridClass, sectionBodyGap)}>
          <UserAvatarField control={control} onUploadingChange={onAvatarUploadingChange} />
          <TextRow control={control} name="name" label={t('users.form.name')} required />
          <TextRow control={control} name="employeeNo" label={t('users.form.employeeNo')} mono />
        </div>
        <div className={cn(gridClass, sectionBodyGap)}>
          <TextRow control={control} name="phone" label={t('users.form.phone')} mono />
          <TextRow control={control} name="email" label={t('users.form.email')} type="email" nullable />
          <FormRow control={control} name="gender" label={t('users.form.gender')}>
            {({ field, id, invalid, errorId }) => (
              <SegmentedControl
                id={id}
                aria-label={t('users.form.gender')}
                aria-describedby={errorId}
                aria-invalid={invalid}
                value={field.value ?? 'unset'}
                options={[
                  { value: 'male', label: t('users.gender.male') },
                  { value: 'female', label: t('users.gender.female') },
                  { value: 'other', label: t('users.gender.other') },
                  { value: 'unset', label: t('users.form.unset') },
                ]}
                onValueChange={(next) => field.onChange(next === 'unset' ? null : next)}
              />
            )}
          </FormRow>
        </div>
      </section>

      <PageDivider />

      <section
        data-slot="user-form-section"
        className="px-[calc(24px*var(--app-scale))] py-[calc(14px*var(--app-scale))]"
      >
        <PageSectionHeading
          title={t('users.form.sections.org')}
          description={t('users.form.sections.orgDesc')}
          className="mb-[calc(13px*var(--app-scale))]"
        />
        <div className={cn(gridClass, sectionBodyGap)}>
          <FormRow control={control} name="deptId" label={t('users.form.dept')}>
            {({ field, id, invalid, errorId }) => (
              <PickerPopover
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-describedby={errorId}
                nodes={deptNodes}
                value={field.value}
                aria-label={t('users.form.dept')}
                aria-invalid={invalid}
                placeholder={t('users.form.deptPlaceholder')}
                labels={pickerLabels}
                onChange={(next) => field.onChange(typeof next === 'string' && next ? next : null)}
              />
            )}
          </FormRow>
          <FormRow control={control} name="postId" label={t('users.form.postId')}>
            {({ field, id, invalid, errorId }) =>
              postChoices.isPending ? (
                <FieldValue>{t('posts.loading.list')}</FieldValue>
              ) : postChoices.isError ? (
                <div>
                  <FieldError>{t('posts.loadFailed')}</FieldError>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void postChoices.refetch()}>
                    {t('posts.retry')}
                  </Button>
                </div>
              ) : (
                <SelectControl
                  id={id}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-describedby={errorId}
                  aria-invalid={invalid}
                  value={field.value ?? ''}
                  placeholder={t('users.form.selectPost')}
                  options={[
                    { value: '', label: t('users.form.unset') },
                    ...posts
                      .filter((post) => post.enabled || post.id === field.value)
                      .map((post) => ({
                        value: post.id,
                        label: post.enabled ? post.name : t('users.form.disabledPost', { name: post.name }),
                        disabled: !post.enabled,
                      })),
                  ]}
                  onValueChange={(value) => {
                    field.onChange(value || null);
                    choosePost(value || null);
                  }}
                />
              )
            }
          </FormRow>
          <FormRow control={control} name="managerId" label={t('users.form.manager')}>
            {({ field, id, invalid, errorId }) => (
              <UserManagerField
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-describedby={errorId}
                value={field.value ?? null}
                aria-invalid={invalid}
                labels={pickerLabels}
                onChange={(next) => field.onChange(typeof next === 'string' && next ? next : null)}
              />
            )}
          </FormRow>
        </div>
        <div className={cn(gridClass, sectionBodyGap)}>
          <FormRow control={control} name="employmentType" label={t('users.form.employmentType')}>
            {({ field, id, invalid, errorId }) => (
              <SelectControl
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-describedby={errorId}
                aria-invalid={invalid}
                value={field.value ?? ''}
                placeholder={t('users.form.unset')}
                options={(['fulltime', 'parttime', 'intern', 'outsourced'] as const).map((value) => ({
                  value,
                  label: t(`users.employmentType.${value}`),
                }))}
                onValueChange={field.onChange}
              />
            )}
          </FormRow>
          <DateRow
            control={control}
            name="joinedAt"
            nullable
            label={t('users.form.joinedAt')}
            presetKeys={['today', 'monthEnd']}
          />
          <TextRow control={control} name="workLocation" label={t('users.form.workLocation')} />
        </div>
      </section>

      <PageDivider />

      <section
        data-slot="user-form-section"
        className="px-[calc(24px*var(--app-scale))] py-[calc(14px*var(--app-scale))]"
      >
        <PageSectionHeading
          title={t('users.form.sections.account')}
          description={t('users.form.sections.accountDesc')}
          className="mb-[calc(13px*var(--app-scale))]"
        />
        <div className={cn(gridClass, sectionBodyGap)}>
          <TextRow
            control={control}
            name="username"
            disabled={mode === 'edit'}
            label={t('users.form.account')}
            required
            mono
          />
          {/* 新建时显示并提交同一初始密码，重新生成会更新表单值。 */}
          {mode === 'create' && (
            <Field>
              <FieldLabel presentation="form">{t('users.form.initialPassword')}</FieldLabel>
              <div className="flex h-[var(--control-md)] items-center gap-[calc(8px*var(--app-scale))]">
                <FieldValue mono className="min-w-0 flex-1 truncate">
                  {initialPassword}
                </FieldValue>
                <Button type="button" variant="secondary" size="xs" onClick={onRegeneratePassword}>
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  {t('users.form.regeneratePassword')}
                </Button>
              </div>
              <PasswordPolicyHint />
            </Field>
          )}
          <Field>
            <FieldLabel presentation="form">{t('users.form.dataScope')}</FieldLabel>
            <FieldValue>{t('users.form.derivedAccess')}</FieldValue>
          </Field>
        </div>
        <div className={cn(gridClass, sectionBodyGap)}>
          <FormRow control={control} name="roleIds" label={t('users.form.role')}>
            {({ field, id, invalid, errorId }) => (
              <ChipsField
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-describedby={errorId}
                nodes={roleNodes}
                value={field.value ?? []}
                aria-label={t('users.form.role')}
                aria-invalid={invalid}
                labels={chipsLabels}
                disabled={!canAssignRoles}
                onChange={(value) => {
                  markRolesChanged(true);
                  suggestPost(null);
                  field.onChange(value);
                }}
              />
            )}
          </FormRow>
          {suggestion && (
            <Field>
              <FieldValue>
                {t('users.form.postRoleSuggestion', {
                  roles: suggestion.roles.map((role) => role.name).join('、') || t('posts.noRoles'),
                })}
              </FieldValue>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  roleField.onChange(suggestion.roleIds);
                  suggestPost(null);
                }}
              >
                {t('users.form.applyPostRoles')}
              </Button>
            </Field>
          )}
          <Field>
            <FieldLabel presentation="form">{t('users.form.subsystems')}</FieldLabel>
            <FieldValue>{t('users.form.derivedAccess')}</FieldValue>
          </Field>
        </div>
        <div className={gridClass}>
          {/* 板 L136 账号状态格：34×20 开关 + 「启用」 + 灰字「首次登录须修改密码」 */}
          <Field>
            <FieldLabel presentation="form">{t('users.form.enabled')}</FieldLabel>
            <span>{t(accountEnabled ? 'users.form.enabledOn' : 'users.form.enabledOff')}</span>
            <div className="flex h-[var(--control-md)] items-center gap-[calc(10px*var(--app-scale))]">
              <Controller
                control={control}
                name="mustChangePassword"
                render={({ field }) => (
                  <FieldLabel
                    presentation="hint"
                    className="flex items-center gap-[calc(6px*var(--app-scale))]"
                  >
                    <Checkbox
                      disabled={mode === 'edit'}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    {t('users.form.mustChangePassword')}
                  </FieldLabel>
                )}
              />
            </div>
          </Field>
          <DateRow
            control={control}
            name="effectiveAt"
            disabled={mode === 'edit'}
            label={t('users.form.effectiveAt')}
            presetKeys={['today', 'tomorrow', 'nextWeek', 'monthEnd']}
            nullable
          />
          <TextRow
            control={control}
            name="remark"
            label={t('users.form.remark')}
            placeholder={t('users.form.optional')}
            nullable
          />
        </div>
      </section>
    </MarkChangesContext.Provider>
  );
}

interface FormRowRenderArgs<TName extends FieldPath<UserFormInput>> {
  field: ControllerRenderProps<UserFormInput, TName>;
  id: string;
  invalid: boolean;
  errorId: string | undefined;
}

function FormRow<TName extends FieldPath<UserFormInput>>({
  control,
  name,
  label,
  required = false,
  children,
}: {
  control: Control<UserFormInput>;
  name: TName;
  label: string;
  required?: boolean;
  children: (args: FormRowRenderArgs<TName>) => ReactNode;
}) {
  const id = useId();
  const { t } = useTranslation('admin');
  const markChanges = useContext(MarkChangesContext);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={fieldState.invalid || undefined}
          data-changed={(markChanges && fieldState.isDirty) || undefined}
          className="gap-[calc(6px*var(--app-scale))]"
        >
          <FieldLabel
            htmlFor={id}
            required={required}
            changed={markChanges && fieldState.isDirty}
            presentation="form"
          >
            {label}
          </FieldLabel>
          {children({
            field,
            id,
            invalid: fieldState.invalid,
            errorId: fieldState.error ? `${id}-error` : undefined,
          })}
          <FieldError id={`${id}-error`}>
            {fieldState.error ? fieldErrorText(fieldState.error.type, fieldState.error.message, t) : null}
          </FieldError>
        </Field>
      )}
    />
  );
}

function TextRow<TName extends FieldPath<UserFormInput>>({
  control,
  name,
  label,
  required,
  mono,
  type = 'text',
  placeholder,
  nullable = false,
  disabled = false,
}: {
  control: Control<UserFormInput>;
  name: TName;
  label: string;
  required?: boolean;
  mono?: boolean;
  type?: 'text' | 'email';
  disabled?: boolean;
  placeholder?: string;
  nullable?: boolean;
}) {
  return (
    <FormRow control={control} name={name} label={label} required={required}>
      {({ field, id, invalid, errorId }) => (
        <Input
          ref={field.ref}
          aria-describedby={errorId}
          id={id}
          type={type}
          disabled={disabled}
          aria-invalid={invalid}
          placeholder={placeholder}
          inputSize="form"
          mono={mono}
          value={typeof field.value === 'string' ? field.value : ''}
          onBlur={field.onBlur}
          onChange={(event) =>
            field.onChange(nullable && event.target.value === '' ? null : event.target.value)
          }
        />
      )}
    </FormRow>
  );
}

type DatePresetKey = 'today' | 'tomorrow' | 'nextWeek' | 'monthEnd';

function presetDate(key: DatePresetKey): string {
  const now = new Date();
  if (key === 'monthEnd') return formatIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const offset = key === 'tomorrow' ? 1 : key === 'nextWeek' ? 7 : 0;
  return formatIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

function DateRow<TName extends FieldPath<UserFormInput>>({
  control,
  name,
  label,
  required,
  nullable = false,
  presetKeys,
  disabled,
}: {
  control: Control<UserFormInput>;
  name: TName;
  label: string;
  required?: boolean;
  nullable?: boolean;

  presetKeys: readonly DatePresetKey[];
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('admin');
  const presets = useMemo<DatePickerPreset[]>(
    () =>
      presetKeys.map((key) => ({
        label: t(`users.form.datePicker.presets.${key}`),
        value: presetDate(key),
      })),
    [presetKeys, t],
  );

  return (
    <FormRow control={control} name={name} label={label} required={required}>
      {({ field, id, invalid, errorId }) => (
        <DatePicker
          disabled={disabled}
          ref={field.ref}
          onBlur={field.onBlur}
          aria-describedby={errorId}
          id={id}
          value={typeof field.value === 'string' && field.value !== '' ? field.value.slice(0, 10) : null}
          aria-label={label}
          aria-invalid={invalid}
          placeholder={t('users.form.datePicker.placeholder')}
          presets={presets}
          locale={i18n.language}
          labels={{
            today: t('users.form.datePicker.today'),
            clear: t('users.form.datePicker.clear'),
            confirm: t('users.form.datePicker.confirm'),
            now: t('users.form.datePicker.now'),
            time: t('users.form.datePicker.time'),
          }}
          onChange={(next) =>
            field.onChange(
              next
                ? name === 'effectiveAt'
                  ? new Date(`${next}T00:00:00`).toISOString()
                  : next
                : nullable
                  ? null
                  : '',
            )
          }
        />
      )}
    </FormRow>
  );
}

/** zod issue code → 本地化文案；未覆盖的 code 原样透传（开发期能看到真实原因） */
function fieldErrorText(code: string, message: string | undefined, t: (key: string) => string): string {
  if (code === 'too_small' || code === 'invalid_type') return t('users.form.errors.required');
  if (code === 'invalid_string' || code === 'invalid_format') return t('users.form.errors.format');
  return message ?? t('users.form.errors.required');
}
