import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DescriptionList, type DescriptionListItem } from '@/components/pro/DescriptionList';
import { DiffList, type DiffListItem } from '@/components/pro/DiffList';
import { DetailAside, DetailSection } from '@/components/pro/page-scaffold';
import { FieldDescription } from '@/components/ui/field';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  userDeptTreeQuery as deptTreeQuery,
  userManagerOptionsQuery,
  userPostsQuery,
  userRolesQuery as rolesQuery,
} from '../api/dictionaries';
import type { UserDetailDto, UserFormInput } from '../api';
import { maskPhone, userDeptPathLabel } from '../model';
import { userFormChanges, type UserChangeField } from './model';

const dash = '—';
const isEmpty = (value: unknown) =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

function useFormDisplay() {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const { data: posts = [] } = useQuery(userPostsQuery);
  const { data: roles = [] } = useQuery(rolesQuery);
  const roleNames = (ids: readonly string[]) =>
    ids.map((id) => roles.find((role) => role.id === id)?.name ?? id).join('、') || dash;
  const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : dash);
  const show = (field: UserChangeField, value: unknown, managerName?: string | null): string => {
    switch (field) {
      case 'phone':
        return typeof value === 'string' && value ? maskPhone(value) : dash;
      case 'gender':
        return typeof value === 'string' && value ? t(`users.gender.${value}`) : t('users.form.unset');
      case 'employmentType':
        return typeof value === 'string' && value
          ? t(`users.employmentType.${value}`)
          : t('users.form.unset');
      case 'deptId':
        return userDeptPathLabel(depts, typeof value === 'string' ? value : null);
      case 'postId':
        return posts.find((post) => post.id === value)?.name ?? dash;
      case 'managerId':
        return managerName ?? (value ? t('users.form.aside.avatarChanged') : t('users.form.aside.unmanaged'));
      case 'roleIds':
        return roleNames(Array.isArray(value) ? (value as string[]) : []);
      case 'effectiveAt':
        return typeof value === 'string' && value ? value.slice(0, 10) : t('users.form.aside.unlimited');
      case 'avatarId':
        return value ? t('users.form.aside.avatarChanged') : t('users.form.aside.unmanaged');
      default:
        return text(value);
    }
  };
  return { t, show, depts, posts, roleNames };
}

const labelKey: Record<UserChangeField, string> = {
  avatarId: 'avatar',
  name: 'name',
  employeeNo: 'employeeNo',
  phone: 'phone',
  email: 'email',
  gender: 'gender',
  deptId: 'dept',
  postId: 'postId',
  managerId: 'manager',
  employmentType: 'employmentType',
  joinedAt: 'joinedAt',
  workLocation: 'workLocation',
  roleIds: 'role',
  effectiveAt: 'effectiveAt',
  remark: 'remark',
};

function useManagerName(id: string | null) {
  const options = useInfiniteQuery({
    ...userManagerOptionsQuery({ selectedId: id ?? undefined }),
    enabled: !!id,
  });
  return id ? (options.data?.pages.find((page) => page.selected)?.selected?.name ?? null) : null;
}

export function UserFormAside({
  mode,
  baseline,
  values,
}: {
  mode: 'create' | 'edit';
  baseline?: UserDetailDto;
  values: UserFormInput;
}) {
  return (
    <DetailAside
      variant="side"
      data-slot="user-form-aside"
      className="hidden w-[calc(300px*var(--app-scale))] flex-col gap-[calc(12px*var(--app-scale))] p-[calc(20px*var(--app-scale))] lg:flex"
    >
      {mode === 'edit' && baseline ? (
        <ChangeSummary baseline={baseline} values={values} />
      ) : (
        <CreatePreview values={values} />
      )}
    </DetailAside>
  );
}

function ChangeSummary({ baseline, values }: { baseline: UserDetailDto; values: UserFormInput }) {
  const { t, show } = useFormDisplay();
  const nextManager = useManagerName(values.managerId ?? null);
  const changes = userFormChanges(baseline, values);
  const items: DiffListItem[] = changes.map((change) => {
    const shown = (raw: unknown, manager: string | null | undefined) =>
      isEmpty(raw) ? null : show(change.field, raw, manager);
    return {
      key: change.field,
      label: t(`users.form.${labelKey[change.field]}`),
      from: shown(change.from, baseline.managerName),
      to: shown(change.to, nextManager),
    };
  });
  return (
    <>
      <DetailSection title={t('users.form.aside.changes')} bodyClassName="p-0">
        <DiffList
          items={items}
          labels={{ added: t('users.form.aside.added'), cleared: t('users.form.aside.cleared') }}
          empty={t('users.form.aside.noChanges')}
        />
      </DetailSection>
      <FieldDescription size="compact">{t('users.form.aside.changesNote')}</FieldDescription>
    </>
  );
}

function CreatePreview({ values }: { values: UserFormInput }) {
  const { t, show } = useFormDisplay();
  const items: DescriptionListItem[] = [
    { label: t('users.form.dept'), value: show('deptId', values.deptId) },
    { label: t('users.form.postId'), value: show('postId', values.postId) },
    {
      label: t('users.form.role'),
      value: values.roleIds.length
        ? t('users.form.aside.previewRoles', { count: values.roleIds.length })
        : t('users.form.aside.previewNoRoles'),
    },
    {
      label: t('users.form.aside.mustChange'),
      value: values.mustChangePassword ? t('users.form.aside.on') : t('users.form.aside.off'),
    },
  ];
  return (
    <>
      <DetailSection title={t('users.form.aside.preview')}>
        <div className="mb-[calc(10px*var(--app-scale))] flex items-center gap-[calc(12px*var(--app-scale))]">
          <Avatar size="hero">
            <AvatarFallback>{values.name.trim().slice(0, 1) || '?'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm">{values.name.trim() || t('users.form.aside.previewName')}</div>
            <div className="truncate font-mono text-xs">{values.username || dash}</div>
          </div>
        </div>
        <DescriptionList items={items} size="compact" divided />
      </DetailSection>
      <FieldDescription size="compact">{t('users.form.aside.previewNote')}</FieldDescription>
    </>
  );
}
