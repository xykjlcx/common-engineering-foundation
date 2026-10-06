import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusTabs } from '@/components/pro/StatusTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SideCardList } from '@/components/pro/SideList';
import {
  DetailAside,
  DetailHeader,
  DetailSection,
  DetailWorkspace,
  PagePane,
  PagePaneBody,
  PagePaneFooter,
  PagePaneHeader,
  PageThreePane,
  PageSectionHeading,
  PageDivider,
  PageBreadcrumb,
  PagePaneToolbar,
} from '@/components/pro/page-scaffold';

// 页面骨架状态矩阵（PageThreePane 三栏 + DetailHeader / DetailWorkspace / DetailAside）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function PageScaffoldMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="pageScaffoldMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.shellStateMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <PageCardChromeMatrix />
      <div data-testid="pageSectionHeadingMatrix" className="mb-4 grid gap-4">
        <PageSectionHeading title={t('dev.themeStates.tableName')} />
        <PageDivider />
        <PageSectionHeading
          title={t('dev.themeStates.tableName')}
          description={t('dev.themeStates.step7MatrixDesc')}
          actions={<Button size="sm">{t('dev.themeStates.tableActionView')}</Button>}
        />
      </div>
      <div className="grid gap-4">
        <div
          data-testid="pageThreePaneMatrix"
          className="min-h-[calc(280px*var(--app-scale))] overflow-hidden rounded-10 border border-(--page-surface-border)"
        >
          <PageThreePane>
            <PagePane variant="navigation">
              <PagePaneHeader title={t('dev.themeStates.shellStateMatrix')} />
              <PagePaneBody>
                <SideCardList
                  activeId="members"
                  onSelect={() => undefined}
                  items={[
                    {
                      id: 'members',
                      label: t('dev.themeStates.sideList.members'),
                      ariaLabel: t('dev.themeStates.sideList.members'),
                      description: t('dev.themeStates.tableStatusEnabled'),
                      icon: <CheckIcon data-icon="inline" />,
                      action: (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('dev.themeStates.tableActionEdit')}
                        >
                          <CheckIcon data-icon="inline" />
                        </Button>
                      ),
                    },
                    {
                      id: 'roles',
                      label: t('dev.themeStates.sideList.roles'),
                      ariaLabel: t('dev.themeStates.sideList.roles'),
                      description: t('dev.themeStates.dataTableNormal'),
                    },
                  ]}
                />
              </PagePaneBody>
              <PagePaneFooter>
                <Button type="button" variant="dashed" block>
                  {t('dev.themeStates.tableActionEdit')}
                </Button>
              </PagePaneFooter>
            </PagePane>
            <PagePane variant="master">
              <PagePaneHeader title={t('dev.themeStates.treeStateMatrix')} />
              <PagePaneBody>{t('dev.themeStates.treeNodes.all')}</PagePaneBody>
            </PagePane>
            <PagePane variant="detail">
              <PagePaneHeader title={t('dev.themeStates.tableSelected')} />
              <PagePaneBody>{t('dev.themeStates.tableStatusEnabled')}</PagePaneBody>
            </PagePane>
          </PageThreePane>
        </div>

        <div data-testid="detailWorkspaceMatrix">
          <DetailHeader
            title={t('dev.themeStates.tableSelected')}
            subtitle={t('dev.themeStates.dataTableNormal')}
            status={<Badge variant="success">{t('dev.themeStates.tableStatusEnabled')}</Badge>}
            actions={<Button size="sm">{t('dev.themeStates.tableActionView')}</Button>}
          />
          <DetailWorkspace>
            <DetailSection title={t('dev.themeStates.tableName')}>
              {t('dev.themeStates.dataTableNormal')}
            </DetailSection>
            <DetailAside>
              <DetailSection title={t('dev.themeStates.tableStatus')}>
                {t('dev.themeStates.tableStatusEnabled')}
              </DetailSection>
            </DetailAside>
          </DetailWorkspace>
        </div>
      </div>
    </section>
  );
}

function PageCardChromeMatrix() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('members');
  return (
    <div data-testid="pageCardChromeMatrix" className="mb-4">
      <PageBreadcrumb
        items={[t('dev.themeStates.sideList.members')]}
        current={t(`dev.themeStates.sideList.${tab}`)}
        icon={<CheckIcon />}
        trailing={
          <Button size="sm" onClick={() => setTab(tab === 'members' ? 'roles' : 'members')}>
            {t('dev.themeStates.tableActionView')}
          </Button>
        }
      />
      <div className="flex">
        <DetailAside variant="panel" className="w-72 p-4">
          <DetailHeader
            variant="identity"
            title={t('dev.themeStates.tableSelected')}
            avatar={
              <Avatar size="hero">
                <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
              </Avatar>
            }
            subtitle="EMP-001"
            subtitleMono
            status={<Badge variant="success">{t('dev.themeStates.tableStatusEnabled')}</Badge>}
          />
        </DetailAside>
        <div className="min-w-0 flex-1">
          <PagePaneToolbar variant="tabs">
            <StatusTabs
              value={tab}
              onValueChange={setTab}
              items={['members', 'roles'].map((value) => ({
                value,
                label: t(`dev.themeStates.sideList.${value}`),
              }))}
            />
          </PagePaneToolbar>
          <PagePaneBody>{t(`dev.themeStates.sideList.${tab}`)}</PagePaneBody>
        </div>
      </div>
      <PagePaneFooter variant="form" hint={t('dev.themeStates.fieldReadonly')}>
        <Button disabled>{t('dev.themeStates.choiceDisabled')}</Button>
        <Button onClick={() => setTab('members')}>{t('dev.themeStates.tableActionEdit')}</Button>
      </PagePaneFooter>
    </div>
  );
}
