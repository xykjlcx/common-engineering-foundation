import { FunnelX, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { PermissionAction } from '@/components/pro/PermissionAction';
import type { FilterRoot } from '@/components/pro/filter-builder';

export function UsersNoResult({
  filters,
  keyword,
  onClear,
  onClearKeyword,
}: {
  filters: FilterRoot;
  keyword: string;
  onClear: () => void;
  onClearKeyword: () => void;
}) {
  const { t } = useTranslation('admin');
  const hasConditions = filters.items.length > 0;
  const hasKeyword = keyword !== '';

  // 两者都有 → 两条路都给。「移除最后一个条件」与清除全部语义重叠且占位，已去掉。
  const description = hasConditions
    ? hasKeyword
      ? t('users.empty.noResult.hintWithKeyword', { count: filters.items.length, keyword })
      : t('users.empty.noResult.hint', { count: filters.items.length })
    : t('users.empty.noResult.clearKeyword');

  return (
    <Empty
      variant="noResult"
      icon={<FunnelX aria-hidden="true" />}
      iconSize="compact"
      iconTone="accent"
      title={t('users.empty.noResult.title')}
      description={description}
      action={
        <div className="flex items-center gap-[calc(8px*var(--app-scale))]">
          {hasConditions && (
            <Button type="button" variant="secondary" onClick={onClear}>
              {t('users.empty.noResult.clearAll')}
            </Button>
          )}
          {hasKeyword && (
            <Button type="button" variant={hasConditions ? 'ghost' : 'secondary'} onClick={onClearKeyword}>
              {t('users.empty.noResult.clearKeyword')}
            </Button>
          )}
        </div>
      }
    />
  );
}

export function UsersFirstUse({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  const { t } = useTranslation('admin');
  return (
    <Empty
      variant="firstUse"
      icon={<UserPlus aria-hidden="true" />}
      iconSize="compact"
      iconTone="accent"
      title={t('users.empty.firstUse.title')}
      description={t('users.empty.firstUse.hint')}
      action={
        <div className="flex gap-[calc(8px*var(--app-scale))]">
          <PermissionAction allowed={canCreate} degrade="disable" reason={t('users.permission.noCreate')}>
            <Button type="button" variant="primary" onClick={onCreate}>
              {t('users.actions.create')}
            </Button>
          </PermissionAction>
          <Button type="button" variant="secondary" disabled>
            {t('users.empty.firstUse.import')}
          </Button>
        </div>
      }
    />
  );
}
