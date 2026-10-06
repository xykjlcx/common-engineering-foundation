import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { SideList, type SideListItem } from '@/components/pro/SideList';

// 侧边列表状态矩阵（SideList：active 行 / 计数位）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

const shellTokenItems = ['members', 'roles', 'menus'] as const;

export default function SideListMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [sideListActive, setSideListActive] = useState<(typeof shellTokenItems)[number]>('members');

  const sideListItems: SideListItem[] = shellTokenItems.map((id) => ({
    id,
    label: t(`dev.themeStates.sideList.${id}`),
    meta: id === 'members' ? '14' : undefined,
  }));

  return (
    <section
      data-testid="sideListMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.shellStateMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <div className="overflow-hidden rounded-10 border border-(--side-list-border)">
        <SideList
          items={sideListItems}
          activeId={sideListActive}
          onSelect={(id) => setSideListActive(id as typeof sideListActive)}
        />
      </div>
    </section>
  );
}
