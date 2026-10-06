import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/pro/SearchField';
import { SideList } from '@/components/pro/SideList';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import { authzContext, matchPermission } from '@/lib/permission';
import { dictTypesQuery } from '../api';
import type { DictPageProps } from '../types';
import { DictTypeDialog } from '../form/DictTypeDialog';
import { DictItemsScene } from './DictItemsScene';

export function DictsScene(props: DictPageProps) {
  const { t } = useTranslation('admin');
  const result = useQuery(dictTypesQuery);
  const [creating, setCreating] = useState(false);
  const [typeKeyword, setTypeKeyword] = useState('');
  const types = result.data;

  const visibleTypes = types?.filter((type) =>
    `${type.name} ${type.code}`.toLocaleLowerCase().includes(typeKeyword.trim().toLocaleLowerCase()),
  );

  const active = result.data?.find((type) => type.code === props.search.type) ?? result.data?.[0];
  const { search, onSearchChange } = props;

  useEffect(() => {
    if (result.isSuccess && search.type && !result.data.some((type) => type.code === search.type))
      onSearchChange({ type: undefined, page: 1 });
  }, [result.isSuccess, result.data, search.type, onSearchChange]);

  const canCreate = matchPermission(authzContext(props.permissions, props.systemAdmin), 'sys:dict:create');

  return (
    <>
      {(!types || result.isError) && (
        <QueryState
          data={types}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('dicts.loading')}
          errorLabel={t('dicts.errors.failed')}
          retryLabel={t('dicts.retry')}
          onRetry={() => void result.refetch()}
        >
          {() => null}
        </QueryState>
      )}
      {types &&
        (types.length ? (
          <div className="flex min-h-0 min-w-0 flex-1">
            <SideList
              className="w-[calc(260px*var(--app-scale))] overflow-y-auto"
              items={(visibleTypes ?? []).map((type) => ({
                id: type.code,
                label: type.name,
                meta: type.enabled ? undefined : t('dicts.disabled'),
              }))}
              activeId={active?.code}
              onSelect={(type) => onSearchChange({ type, page: 1 })}
              search={
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <TableText tone="strong">{t('dicts.types')}</TableText>
                    {canCreate && (
                      <Button
                        size="icon-sm"
                        aria-label={t('dicts.createType')}
                        title={t('dicts.createType')}
                        onClick={() => setCreating(true)}
                      >
                        <Plus data-icon="inline-start" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <SearchField
                    aria-label={t('dicts.searchTypes')}
                    placeholder={t('dicts.searchTypes')}
                    value={typeKeyword}
                    onChange={(event) => setTypeKeyword(event.target.value)}
                  />
                  {!visibleTypes?.length && <TableText>{t('dicts.noMatchingTypes')}</TableText>}
                </div>
              }
            />
            {active && <DictItemsScene key={active.id} {...props} typeId={active.id} />}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <TableText>{t('dicts.empty')}</TableText>
            {canCreate && <Button onClick={() => setCreating(true)}>{t('dicts.createType')}</Button>}
          </div>
        ))}
      {creating && (
        <DictTypeDialog
          onClose={() => setCreating(false)}
          onSaved={(type) => onSearchChange({ type, page: 1 })}
        />
      )}
    </>
  );
}
