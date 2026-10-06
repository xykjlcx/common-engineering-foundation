import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

function safeUrl(url: string, key: string) {
  const cleaned = defaultUrlTransform(url.trim());
  const protocol = /^([a-z][a-z\d+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase();
  if (
    protocol &&
    !(key === 'src' ? ['http', 'https'] : ['http', 'https', 'mailto', 'tel']).includes(protocol)
  )
    return '';
  return cleaned;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      data-slot="markdown-content"
      className={cn(
        'min-w-0 max-w-full text-sm leading-relaxed text-text [overflow-wrap:anywhere]',
        '[&>*+*]:mt-3 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h4]:text-sm [&_h5]:text-sm [&_h6]:text-sm',
        '[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold',
        '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li+li]:mt-1',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-(--pro-panel-border) [&_blockquote]:pl-3 [&_blockquote]:text-(--type-2-fg)',
        '[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-(--pro-page-bg) [&_pre]:p-3 [&_pre]:text-xs',
        '[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:[overflow-wrap:anywhere] [&_pre_code]:[overflow-wrap:normal]',
        '[&_hr]:border-(--pro-panel-border) [&_input]:accent-(--button-primary-bg)',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        urlTransform={safeUrl}
        components={{
          a: ({ href, children, title }) =>
            href ? (
              <a
                href={href}
                title={title}
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--button-link-fg) underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--button-ring)"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt, title }) =>
            src ? (
              <img
                src={src}
                alt={alt ?? ''}
                title={title}
                loading="lazy"
                decoding="async"
                className="max-h-[calc(480px*var(--app-scale))] max-w-full rounded-md object-contain"
              />
            ) : (
              <span>{alt}</span>
            ),
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto rounded-md border border-(--table-border)">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children, style }) => (
            <th
              style={style}
              className="border-b border-(--table-border) bg-(--table-header-bg) px-3 py-2 font-medium text-(--table-header-fg)"
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td style={style} className="border-b border-(--table-row-border) px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
