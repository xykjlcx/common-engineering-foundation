import { Fragment, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { permissionDegradeMap, type PermissionDegrade, type PermissionSubject } from '@/lib/permission';
import { Button } from '@/components/ui/button';
import { PermissionAction } from '@/components/pro/PermissionAction';

// 权限降级状态矩阵（PermissionAction 三态 + 六类对象的降级总表）。
// 总表直接由 lib/permission 的映射渲染，保证矩阵页与运行时用的是同一份判据。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

const permissionSubjects = Object.keys(permissionDegradeMap) as PermissionSubject[];
const permissionSubjectLabelKeys: Record<PermissionSubject, string> = {
  highValueAction: 'dev.themeStates.permSubjectHighValueAction',
  action: 'dev.themeStates.permSubjectAction',
  menuItem: 'dev.themeStates.permSubjectMenuItem',
  page: 'dev.themeStates.permSubjectPage',
  tableColumn: 'dev.themeStates.permSubjectTableColumn',
  detailField: 'dev.themeStates.permSubjectDetailField',
};
const permissionDegradeLabelKeys: Record<PermissionDegrade, string> = {
  disable: 'dev.themeStates.permDegradeDisable',
  hide: 'dev.themeStates.permDegradeHide',
  omitFromMenu: 'dev.themeStates.permDegradeOmitFromMenu',
  forbiddenPage: 'dev.themeStates.permDegradeForbiddenPage',
  omitColumn: 'dev.themeStates.permDegradeOmitColumn',
  placeholder: 'dev.themeStates.permDegradePlaceholder',
};

export default function PermDegradeMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="permDegradeMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.permDegradeMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.permDegradeNote')}</p>
      </div>
      <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <PermissionAction allowed degrade="hide">
            <Button size="sm" variant="secondary">
              {t('dev.themeStates.permActionAllowed')}
            </Button>
          </PermissionAction>
          <PermissionAction allowed={false} degrade="hide">
            <Button size="sm" variant="secondary">
              {t('dev.themeStates.permActionHidden')}
            </Button>
          </PermissionAction>
          <PermissionAction allowed={false} degrade="disable" reason={t('dev.themeStates.permActionReason')}>
            <Button size="sm" variant="secondary">
              {t('dev.themeStates.permActionDisabled')}
            </Button>
          </PermissionAction>
        </div>
        <p className="text-xs text-text-3">{t('dev.themeStates.permActionHiddenNote')}</p>
        <dl className="grid grid-cols-[1fr_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="font-medium text-text-3">{t('dev.themeStates.permSubjectHeader')}</dt>
          <dd className="font-medium text-text-3">{t('dev.themeStates.permDegradeHeader')}</dd>
          {permissionSubjects.map((subject) => (
            <Fragment key={subject}>
              <dt className="text-text">{t(permissionSubjectLabelKeys[subject])}</dt>
              <dd className="text-(--type-2-fg)">
                {t(permissionDegradeLabelKeys[permissionDegradeMap[subject]])}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </section>
  );
}
