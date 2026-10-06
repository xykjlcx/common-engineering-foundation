import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';

const parser = unified().use(remarkParse).use(remarkGfm);
const blocks = new Set(['root', 'list', 'listItem', 'blockquote', 'table', 'tableRow']);

interface MarkdownNode {
  type: string;
  children?: readonly MarkdownNode[];
}

function readableText(node: MarkdownNode): string {
  return node.children && blocks.has(node.type) ? node.children.map(readableText).join(' ') : toString(node);
}

export function markdownToPlainText(content: string): string {
  return readableText(parser.parse(content)).replace(/\s+/g, ' ').trim();
}
