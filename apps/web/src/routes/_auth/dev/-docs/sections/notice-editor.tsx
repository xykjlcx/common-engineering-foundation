import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/pro/MarkdownContent';
import {
  NoticeEditorChrome,
  NoticeSettingsGroup,
  NoticeTableLayout,
} from '@/components/pro/NoticeEditorChrome';

export default function NoticeEditorMatrix() {
  return (
    <section data-testid="noticeEditorMatrix" className="grid gap-4 lg:grid-cols-2">
      {[false, true].map((disabled) => (
        <div key={String(disabled)} className="flex h-[calc(360px*var(--app-scale))] min-w-0">
          <NoticeTableLayout>
            <NoticeEditorChrome
              title="Editor"
              status={<Badge>{disabled ? 'Published' : 'Draft'}</Badge>}
              footer={
                <>
                  <Button size="sm" disabled={disabled}>
                    Publish
                  </Button>
                  <Button variant="secondary" size="sm" disabled={disabled}>
                    Save
                  </Button>
                </>
              }
            >
              <NoticeSettingsGroup>
                {['Pinned', 'Confirmation', 'Schedule'].map((label) => (
                  <label key={label} className="flex items-center justify-between gap-3">
                    {label}
                    <Switch disabled={disabled} aria-label={label} />
                  </label>
                ))}
              </NoticeSettingsGroup>
              <MarkdownContent content={'## Content\n\n' + 'Long paragraph.\n\n'.repeat(20)} />
            </NoticeEditorChrome>
          </NoticeTableLayout>
        </div>
      ))}
    </section>
  );
}
