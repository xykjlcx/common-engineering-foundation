import { useState } from 'react';
import { MarkdownContent } from '@/components/pro/MarkdownContent';
import { MarkdownEditor } from '@/components/pro/MarkdownEditor';

const labels = {
  bold: 'Bold',
  italic: 'Italic',
  heading: 'Heading',
  list: 'List',
  link: 'Link',
  preview: 'Preview',
  edit: 'Edit',
  placeholder: 'Markdown',
  help: 'Markdown · Ctrl / ⌘ + B, I, K',
};
const sample =
  '## Markdown\n\n**Bold** · *Italic* · ~~Deleted~~\nLine break\n\n- First\n- Second\n\n> Quote\n\n| Name | Value |\n| --- | --- |\n| A | 100 |\n\n```ts\nconst content = "Markdown";\n```\n\n[Link](https://example.com)\n\n<img src=x onerror=alert(1)>';

export default function MarkdownMatrix() {
  const [value, setValue] = useState(sample);
  return (
    <section data-testid="markdownMatrix" className="grid min-w-0 gap-4">
      <MarkdownEditor
        id="markdown-default"
        value={value}
        onValueChange={setValue}
        labels={labels}
        maxLength={20000}
      />
      <MarkdownEditor
        id="markdown-disabled"
        value={sample}
        onValueChange={() => undefined}
        labels={labels}
        disabled
      />
      <MarkdownEditor
        id="markdown-invalid"
        value=""
        onValueChange={() => undefined}
        labels={labels}
        invalid
      />
      <MarkdownContent content={value} />
      <MarkdownContent content={`## Long content\n\n${'UnbrokenContent'.repeat(100)}\n\n${sample}`} />
    </section>
  );
}
