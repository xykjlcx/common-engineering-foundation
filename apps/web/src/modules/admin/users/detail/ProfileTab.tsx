import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DescriptionList, type DescriptionListItem } from '@/components/pro/DescriptionList';
import { DetailMain, DetailSection, DetailWorkspace } from '@/components/pro/page-scaffold';
import { formatLocalDateTime } from '@/lib/datetime';
import { userDeptTreeQuery as deptTreeQuery, userDeptPathLabel as deptPathLabel } from '../api/dictionaries';
import { formatLastLogin, maskPhone } from '../model';
import type { UserDetailDto } from '../api';

export function ProfileTab({ user }: { user: UserDetailDto }): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);

  const basic: DescriptionListItem[] = [
    { label: t('users.form.name'), value: user.name },
    { label: t('users.form.employeeNo'), value: user.employeeNo, mono: true },
    { label: t('users.form.phone'), value: maskPhone(user.phone), mono: true },
    { label: t('users.form.email'), value: user.email },
    {
      label: t('users.form.gender'),
      value: user.gender ? t(`users.gender.${user.gender}`) : '—',
    },
  ];
  const org: DescriptionListItem[] = [
    { label: t('users.form.dept'), value: deptPathLabel(depts, user.deptId) },
    { label: t('users.form.postId'), value: user.postName },
    { label: t('users.form.manager'), value: user.managerName ?? '—' },
    {
      label: t('users.form.employmentType'),
      value: user.employmentType
        ? t(`users.employmentType.${user.employmentType}`, { defaultValue: user.employmentType })
        : '—',
    },
    { label: t('users.form.joinedAt'), value: user.joinedAt, mono: true },
    { label: t('users.form.workLocation'), value: user.workLocation },
  ];
  const account: DescriptionListItem[] = [
    { label: t('users.form.account'), value: user.account, mono: true },
    { label: t('users.form.dataScope'), value: t('users.form.derivedAccess') },
    {
      label: t('users.form.enabled'),
      value: user.enabled ? t('users.form.enabledOn') : t('users.form.enabledOff'),
    },
    {
      label: t('users.form.mustChangePassword'),
      value: user.mustChangePassword ? t('users.yes') : t('users.no'),
    },
    { label: t('users.form.effectiveAt'), value: user.effectiveAt ?? '—', mono: true },
    { label: t('users.form.remark'), value: user.remark ?? '—' },
  ];
  const lastLogin = formatLastLogin(user.lastLoginAt, new Date(), (key, options) =>
    t(`users.lastLogin.${key}`, options ?? {}),
  );
  const loginItems: DescriptionListItem[] = [
    { label: t('users.detail.lastLogin'), value: lastLogin || '—', mono: true },
    { label: t('users.detail.lastLoginIp'), value: user.lastLoginIp ?? '—', mono: true },
  ];
  const createdItems: DescriptionListItem[] = [
    { label: t('users.detail.createdBy'), value: user.createdByName ?? user.createdBy ?? '—' },
    { label: t('users.detail.createdAt'), value: formatLocalDateTime(user.createdAt), mono: true },
  ];

  return (
    <DetailWorkspace data-slot="user-profile-tab" className="gap-2.5">
      <DetailMain className="gap-2.5">
        <DetailSection title={t('users.form.sections.basic')}>
          <DescriptionList items={basic} columns={2} size="compact" />
        </DetailSection>
        <DetailSection title={t('users.form.sections.org')}>
          <DescriptionList items={org} columns={2} size="compact" />
        </DetailSection>
        <DetailSection title={t('users.form.sections.account')}>
          <DescriptionList items={account} columns={2} size="compact" />
        </DetailSection>
      </DetailMain>
      <DetailMain className="gap-2.5">
        <DetailSection title={t('users.detail.activityInfo')}>
          <DescriptionList items={loginItems} size="compact" />
        </DetailSection>
        <DetailSection title={t('users.detail.createdInfo')}>
          <DescriptionList items={createdItems} size="compact" />
        </DetailSection>
      </DetailMain>
    </DetailWorkspace>
  );
}
