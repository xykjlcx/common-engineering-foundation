import { useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns3, Rows3 } from 'lucide-react';
import {
  DataToolbar,
  DataToolbarGroup,
  SummaryStrip,
  ToolbarIconActions,
} from '@/components/pro/DataToolbar';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { ListToolbar } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// 表格工具栏族状态矩阵（DataToolbar / SummaryStrip / ToolbarIconActions / FullscreenSurface）。
// 板：DSAdditions.dc.html 4.9。
// 说明：dev-only 状态矩阵，ToolbarIconActions 段的夹具文案直接取板上原文，不进 i18n 资源；
// DataToolbar / SummaryStrip 段沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

const noop = () => undefined;

const toolbarLabels = {
  refresh: '刷新',
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
};

/** 板 4.9 里「密度 / 列设置」两个既有图标钮的占位（真实页面用 pro/ColumnSettings 触发器） */
function DensityAndColumnsStub(): JSX.Element {
  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="密度">
        <Rows3 data-icon="only" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="列设置">
        <Columns3 data-icon="only" aria-hidden="true" />
      </Button>
    </>
  );
}

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`toolbarFullscreen.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

function FakeRows(): JSX.Element {
  return (
    <div className="flex flex-col">
      <div className="flex h-[calc(32px*var(--app-scale))] items-center gap-[calc(16px*var(--app-scale))] border-b border-(--table-border) bg-(--table-header-bg) px-[calc(16px*var(--app-scale))] text-xs font-medium text-text-3">
        <span className="w-[calc(110px*var(--app-scale))]">工号</span>
        <span className="w-[calc(120px*var(--app-scale))]">姓名</span>
        <span className="flex-1">部门</span>
      </div>
      {[
        ['EMP-0231', '林小雨', '财务部 · 华南'],
        ['EMP-0198', '王志强', '财务部'],
        ['EMP-0244', '陈晓', '市场部 · 华南'],
      ].map(([code, name, dept]) => (
        <div
          key={code}
          className="flex h-[calc(32px*var(--app-scale))] items-center gap-[calc(16px*var(--app-scale))] border-b border-(--table-row-border) px-[calc(16px*var(--app-scale))] text-[calc(13px*var(--app-scale))]"
        >
          <span className="w-[calc(110px*var(--app-scale))] tabular-nums text-(--type-2-fg)">{code}</span>
          <span className="w-[calc(120px*var(--app-scale))] font-medium text-text">{name}</span>
          <span className="flex-1 text-(--type-2-fg)">{dept}</span>
        </div>
      ))}
    </div>
  );
}

export default function DataToolbarMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <section
      data-testid="dataToolbarMatrix"
      className="mt-8 rounded-md border border-border bg-surface-2 p-4"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">表格工具栏族与全屏态</h2>
        <p className="text-sm text-(--type-2-fg)">
          DataToolbar / SummaryStrip · ToolbarIconActions（刷新 · 密度 · 列设置 · 全屏）/ FullscreenSurface
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4">
          <SummaryStrip
            aria-label={t('dev.themeStates.dataTableMatrix')}
            items={[
              { label: t('dev.themeStates.tableStatusEnabled'), value: 42 },
              { label: t('dev.themeStates.dataTableSelected'), value: 3 },
            ]}
          />
          <DataToolbar variant="surface" aria-label={t('dev.themeStates.dataTableMatrix')}>
            <DataToolbarGroup>
              <SearchField placeholder={t('dev.themeStates.fieldSearchPlaceholder')} />
            </DataToolbarGroup>
            <DataToolbarGroup align="end">
              <Button size="sm" variant="outline">
                {t('dev.themeStates.tableActionView')}
              </Button>
            </DataToolbarGroup>
          </DataToolbar>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Cell id="ToolbarIconActions.default" title="工具栏右组：默认四钮（刷新 · 密度 · 列设置 · 全屏）">
            <ListToolbar
              leading={
                <>
                  <SearchField
                    aria-label="搜索姓名 / 工号"
                    placeholder="搜索姓名 / 工号"
                    containerClassName="w-[calc(220px*var(--app-scale))]"
                    readOnly
                  />
                  <ToolbarIconActions
                    onRefresh={noop}
                    fullscreen={{ active: false, onToggle: noop }}
                    labels={toolbarLabels}
                  >
                    <DensityAndColumnsStub />
                  </ToolbarIconActions>
                </>
              }
            />
          </Cell>

          <Cell id="ToolbarIconActions.tooltip" title="hover 提示：深色 tooltip 在钮下方">
            <Tooltip open>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="刷新">
                  <Rows3 data-icon="only" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                刷新
              </TooltipContent>
            </Tooltip>
          </Cell>

          <Cell id="ToolbarIconActions.refreshing" title="刷新中：图标自转（受控 refreshing）">
            <ToolbarIconActions
              onRefresh={noop}
              refreshing
              fullscreen={{ active: false, onToggle: noop }}
              labels={toolbarLabels}
            >
              <DensityAndColumnsStub />
            </ToolbarIconActions>
          </Cell>

          <Cell id="ToolbarIconActions.fullscreenActive" title="全屏已开：图标换成退出全屏">
            <ToolbarIconActions
              onRefresh={noop}
              fullscreen={{ active: true, onToggle: noop }}
              labels={toolbarLabels}
            >
              <DensityAndColumnsStub />
            </ToolbarIconActions>
          </Cell>

          <Cell id="ToolbarIconActions.refreshOnly" title="只给刷新：不渲染全屏钮">
            <ToolbarIconActions onRefresh={noop} labels={toolbarLabels} />
          </Cell>

          <Cell id="ToolbarIconActions.fullscreenOnly" title="只给全屏：不渲染刷新钮">
            <ToolbarIconActions fullscreen={{ active: false, onToggle: noop }} labels={toolbarLabels} />
          </Cell>
        </div>

        <Cell id="FullscreenSurface.inline" title="全屏态缩样（inline，300 高；真实态是 fixed 整屏）">
          <FullscreenSurface
            inline
            title="用户管理"
            subtitle="全屏 · 128 条"
            escHint="Esc 退出"
            exitLabel="退出全屏"
            onExit={noop}
          >
            <FakeRows />
          </FullscreenSurface>
        </Cell>

        <Cell id="FullscreenSurface.live" title="全屏态：真开一次（fixed 整屏，Esc 退出）">
          <ToolbarIconActions
            fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((open) => !open) }}
            labels={toolbarLabels}
          />
          {fullscreen ? (
            <FullscreenSurface
              title="用户管理"
              subtitle="全屏 · 128 条"
              escHint="Esc 退出"
              exitLabel="退出全屏"
              onExit={() => setFullscreen(false)}
            >
              <FakeRows />
            </FullscreenSurface>
          ) : null}
        </Cell>
      </div>
    </section>
  );
}
