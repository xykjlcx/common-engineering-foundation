import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/pro/AnimatedTabs';

// 标签页族状态矩阵：默认 pill / line 两个 variant + AnimatedTabs 滑块。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function TabsMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [animatedTabsValue, setAnimatedTabsValue] = useState<'members' | 'logs'>('members');
  const animatedTabItems: AnimatedTabItem<'members' | 'logs'>[] = [
    { value: 'members', label: t('dev.themeStates.animatedTabMembers') },
    { value: 'logs', label: t('dev.themeStates.animatedTabLogs') },
  ];

  return (
    <section
      data-testid="tabsMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.tabsMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step6MatrixDesc')}</p>
      </div>
      {/* 画布规定 tab 选中药丸 = {colors.fill} 铺在纸面上；演示区必须是纸面，否则药丸与灰面板同色 */}
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="grid gap-5 md:grid-cols-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{t('dev.themeStates.tabOverview')}</TabsTrigger>
              <TabsTrigger value="metrics">{t('dev.themeStates.tabMetrics')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-3 text-sm text-(--type-2-fg)">
              {t('dev.themeStates.tabOverviewContent')}
            </TabsContent>
          </Tabs>

          <Tabs defaultValue="metrics">
            <TabsList variant="line">
              <TabsTrigger value="overview">{t('dev.themeStates.tabOverview')}</TabsTrigger>
              <TabsTrigger value="metrics">{t('dev.themeStates.tabMetrics')}</TabsTrigger>
            </TabsList>
            <TabsContent value="metrics" className="pt-3 text-sm text-(--type-2-fg)">
              {t('dev.themeStates.tabMetricsContent')}
            </TabsContent>
          </Tabs>

          <div className="md:col-span-2">
            <AnimatedTabs
              value={animatedTabsValue}
              items={animatedTabItems}
              onValueChange={setAnimatedTabsValue}
              ariaLabel={t('dev.themeStates.animatedTabsAria')}
              variant="content"
            />
            <p className="pt-3 text-sm text-(--type-2-fg)">
              {animatedTabsValue === 'members'
                ? t('dev.themeStates.animatedTabMembersContent')
                : t('dev.themeStates.animatedTabLogsContent')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
