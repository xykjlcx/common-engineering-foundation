import { useLayoutEffect, useRef, useState } from 'react';
import { Bold, Heading2, Italic, Link, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownContent } from './MarkdownContent';

export interface MarkdownEditorProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  maxLength?: number;
  labels: {
    bold: string;
    italic: string;
    heading: string;
    list: string;
    link: string;
    preview: string;
    edit: string;
    placeholder: string;
    help: string;
  };
}

type Format = 'bold' | 'italic' | 'heading' | 'list' | 'link';
const formats = [
  { key: 'bold', icon: Bold },
  { key: 'italic', icon: Italic },
  { key: 'heading', icon: Heading2 },
  { key: 'list', icon: List },
  { key: 'link', icon: Link },
] satisfies { key: Format; icon: typeof Bold }[];

export function MarkdownEditor({
  id,
  value,
  onValueChange,
  onBlur,
  disabled,
  invalid,
  maxLength,
  labels,
}: MarkdownEditorProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const [preview, setPreview] = useState(false);

  useLayoutEffect(() => {
    if (!selection.current || !textarea.current) return;
    textarea.current.focus();
    textarea.current.setSelectionRange(selection.current.start, selection.current.end);
    selection.current = null;
  }, [value]);

  function format(kind: Format) {
    const field = textarea.current;
    if (!field || disabled || preview) return;
    let start = field.selectionStart;
    const end = field.selectionEnd;
    let selected = value.slice(start, end);
    let inserted: string;
    let nextSelection: { start: number; end: number };
    if (kind === 'heading' || kind === 'list') {
      start = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
      selected = value.slice(start, end);
      const prefix = kind === 'heading' ? '## ' : '- ';
      inserted = selected
        .split('\n')
        .map((line) => prefix + line)
        .join('\n');
      nextSelection = { start: start + prefix.length, end: start + inserted.length };
    } else if (kind === 'link') {
      inserted = `[${selected}](https://)`;
      nextSelection = { start: start + selected.length + 3, end: start + inserted.length - 1 };
    } else {
      const marker = kind === 'bold' ? '**' : '*';
      inserted = marker + selected + marker;
      nextSelection = { start: start + marker.length, end: start + marker.length + selected.length };
    }
    const next = value.slice(0, start) + inserted + value.slice(end);
    if (maxLength !== undefined && next.length > maxLength) return;
    selection.current = nextSelection;
    onValueChange(next);
  }

  return (
    <div data-slot="markdown-editor" className="min-w-0 space-y-1.5">
      <div className="overflow-hidden rounded-md border border-(--pro-panel-border) bg-(--pro-panel-bg)">
        <div className="flex flex-wrap items-center gap-1 border-b border-(--pro-panel-border) bg-(--pro-toolbar-bg) px-2.5 py-1.5">
          <div role="group" aria-label={labels.edit} className="flex items-center gap-0.5">
            {formats.map(({ key, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={labels[key]}
                title={labels[key]}
                disabled={disabled || preview}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => format(key)}
              >
                <Icon data-icon aria-hidden="true" />
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="text"
            size="xs"
            className="ml-auto"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? labels.edit : labels.preview}
          </Button>
        </div>
        {preview ? (
          <div className="min-h-[calc(130px*var(--app-scale))] p-3">
            <MarkdownContent content={value} />
          </div>
        ) : (
          <Textarea
            id={id}
            ref={textarea}
            value={value}
            onBlur={onBlur}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-help`}
            placeholder={labels.placeholder}
            maxLength={maxLength}
            className="min-h-[calc(130px*var(--app-scale))] rounded-none border-0 px-3 py-3 shadow-none"
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || !(event.ctrlKey || event.metaKey)) return;
              const key = event.key.toLowerCase();
              const kind = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null;
              if (!kind) return;
              event.preventDefault();
              format(kind);
            }}
          />
        )}
      </div>
      <p id={`${id}-help`} className="text-xs text-text-3">
        {labels.help}
      </p>
    </div>
  );
}
