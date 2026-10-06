import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tree, type TreeNode } from '@/components/pro/Tree';
import { Button } from '@/components/ui/button';

// 树状态矩阵：真实选择 / 多层展开折叠 / 方向键与 Home、End / 焦点与选择分离。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

interface TreeThemeNode {
  id: string;
  labelKey: string;
  depth: number;
  meta?: string;
}

const treeThemeNodes: TreeThemeNode[] = [
  { id: 'all', labelKey: 'dev.themeStates.treeNodes.all', depth: 0, meta: '42' },
  { id: 'rd', labelKey: 'dev.themeStates.treeNodes.rd', depth: 1, meta: '18' },
  { id: 'ops', labelKey: 'dev.themeStates.treeNodes.ops', depth: 2, meta: '8' },
];

export default function TreeMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState(new Set(['all', 'rd']));
  const [selectedId, setSelectedId] = useState('rd');
  const [variant, setVariant] = useState<'management' | 'compact'>('management');

  const treeNodes: TreeNode[] = treeThemeNodes.map((node) => ({
    id: node.id,
    label: t(node.labelKey),
    description: node.id,
    depth: node.depth,
    meta: node.meta,
    expandable: node.id !== 'ops',
    expanded: expandedIds.has(node.id),
    toggleLabel: t('dev.themeStates.treeAriaLabel'),
    leading: <CheckIcon data-icon="inline" />,
    trailing: <Badge variant={node.id === 'rd' ? 'primary' : 'neutral'}>{node.id}</Badge>,
  }));

  return (
    <section
      data-testid="treeMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.treeStateMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <div className="mb-3 flex gap-2">
        {(['management', 'compact'] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={variant === value ? 'primary' : 'secondary'}
            aria-pressed={variant === value}
            onClick={() => setVariant(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <Tree
        variant={variant}
        nodes={treeNodes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onToggle={(id) =>
          setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        ariaLabel={t('dev.themeStates.treeAriaLabel')}
      />
    </section>
  );
}
