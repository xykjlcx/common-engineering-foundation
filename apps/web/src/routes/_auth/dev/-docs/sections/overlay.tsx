import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// 浮层与选项族状态矩阵（Popover / Select 选项 / DropdownMenu 项，走 --overlay-* / --option-* / --menu-item-* token）。
// 三块都是静态内嵌 raw 预览：真实浮层 portal 到 body 会脱离本段，截图截不到。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function OverlayMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="overlayMatrix"
      className="rounded-lg border border-border bg-surface p-4 pb-36 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.step8Matrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step8MatrixDesc')}</p>
      </div>
      <div data-testid="dialogDescriptionMatrix" className="mb-4 flex gap-3">
        {(['default', 'compact'] as const).map((size) => (
          <Dialog key={size}>
            <DialogTrigger asChild>
              <Button>
                {t('dev.themeStates.overlayTrigger')} · {size}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dev.themeStates.overlayTitle')}</DialogTitle>
                <DialogDescription size={size}>{t('dev.themeStates.overlayDesc')}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        ))}
      </div>
      <div data-testid="step8OverlayOptionMatrix" className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.overlayPopover')}</p>
          <div className="grid justify-start gap-2">
            <Button variant="outline">{t('dev.themeStates.overlayTrigger')}</Button>
            <div
              data-slot="popover-content"
              className="anim-modal-in w-[calc(220px*var(--app-scale))] rounded-10 border border-(--overlay-border) bg-(--overlay-bg) p-2 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
            >
              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-text">{t('dev.themeStates.overlayTitle')}</p>
                <p className="text-xs text-(--type-2-fg)">{t('dev.themeStates.overlayDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.optionSelect')}</p>
          <div className="grid gap-2">
            <button
              type="button"
              aria-expanded="true"
              aria-haspopup="listbox"
              className="ui-field flex h-[var(--control-md)] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-(--field-px) text-sm outline-none"
              data-state="open"
            >
              <span>{t('dev.themeStates.fieldResearch')}</span>
              <ChevronDownIcon data-icon="inline-end" className="rotate-180" />
            </button>
            <div
              data-slot="select-content"
              role="listbox"
              className="anim-modal-in flex flex-col gap-(--option-gap) overflow-hidden rounded-10 border border-(--overlay-border) bg-(--overlay-bg) p-1 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
            >
              <div
                data-slot="select-item"
                role="option"
                aria-selected="true"
                className="relative flex min-h-[calc(32px*var(--app-scale))] w-full items-center gap-2 rounded-7 bg-(--option-bg-selected) py-1 pr-8 pl-2 text-sm font-semibold text-(--option-fg-selected)"
              >
                <span
                  data-slot="select-item-indicator"
                  className="absolute right-2 flex size-3.5 items-center justify-center text-(--option-check)"
                >
                  <CheckIcon
                    data-icon="inline-start"
                    className="size-[calc(15px*var(--app-scale))] stroke-[3px]"
                  />
                </span>
                {t('dev.themeStates.fieldResearch')}
              </div>
              <div
                data-slot="select-item"
                role="option"
                className="relative flex min-h-[calc(34px*var(--app-scale))] w-full items-center gap-2 rounded-8 bg-(--option-bg-highlighted) py-1.5 pr-8 pl-2 text-sm text-(--option-fg-highlighted)"
              >
                {t('dev.themeStates.optionHighlighted')}
              </div>
              <div
                data-slot="select-item"
                role="option"
                aria-disabled="true"
                data-disabled
                className="relative flex min-h-[calc(34px*var(--app-scale))] w-full items-center gap-2 rounded-8 py-1.5 pr-8 pl-2 text-sm text-(--option-fg) data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                {t('dev.themeStates.choiceDisabled')}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.menuMatrix')}</p>
          <div className="grid justify-start gap-2">
            <Button variant="outline">{t('dev.themeStates.menuTrigger')}</Button>
            <div
              data-slot="dropdown-menu-content"
              role="menu"
              className="anim-modal-in w-[calc(220px*var(--app-scale))] overflow-hidden rounded-14 border border-(--overlay-border) bg-(--overlay-bg) p-1 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
            >
              <div
                data-slot="dropdown-menu-item"
                role="menuitem"
                className="relative flex cursor-pointer items-center gap-2 rounded-8 px-2 py-1.5 text-sm text-(--menu-item-fg)"
              >
                {t('dev.themeStates.menuNormal')}
              </div>
              <div
                data-slot="dropdown-menu-item"
                role="menuitem"
                className="relative flex cursor-pointer items-center gap-2 rounded-8 bg-(--menu-item-bg-highlighted) px-2 py-1.5 text-sm text-(--menu-item-fg-highlighted)"
              >
                {t('dev.themeStates.menuHighlighted')}
              </div>
              <div data-slot="dropdown-menu-separator" className="-mx-1 my-1 h-px bg-border" />
              <div
                data-slot="dropdown-menu-item"
                role="menuitem"
                data-variant="destructive"
                className="relative flex cursor-pointer items-center gap-2 rounded-8 px-2 py-1.5 text-sm text-(--menu-item-fg-danger)"
              >
                {t('dev.themeStates.menuDanger')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
