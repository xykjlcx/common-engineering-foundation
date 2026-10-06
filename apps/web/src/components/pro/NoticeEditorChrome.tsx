import type { ReactNode } from 'react';

export function NoticeEditorChrome({
  title,
  status,
  actions,
  children,
  footer,
}: {
  title: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div
      data-slot="notice-editor-chrome"
      className="flex min-h-0 flex-1 flex-col gap-[calc(12px*var(--app-scale))] bg-(--page-surface-bg) px-[calc(22px*var(--app-scale))] py-[calc(18px*var(--app-scale))]"
    >
      <header className="flex shrink-0 items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[calc(15px*var(--app-scale))] font-semibold text-(--text)">
          {title}
        </h2>
        {status}
        {actions}
      </header>
      <div
        data-slot="notice-editor-scroll"
        className="grid min-h-0 flex-1 content-start gap-[calc(12px*var(--app-scale))] overflow-y-auto"
      >
        {children}
      </div>
      <footer
        data-slot="notice-editor-footer"
        className="flex shrink-0 items-center gap-[calc(8px*var(--app-scale))]"
      >
        {footer}
      </footer>
    </div>
  );
}

export function NoticeSettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="notice-settings-group"
      className="grid gap-[calc(8px*var(--app-scale))] rounded-8 border border-(--field-border) px-[calc(12px*var(--app-scale))] py-[calc(10px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--type-2-fg)"
    >
      {children}
    </div>
  );
}

export function NoticeTableLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="notice-table-layout"
      className="flex min-h-0 flex-1 flex-col [--table-row-h:calc(40px*var(--app-scale))]"
    >
      {children}
    </div>
  );
}
