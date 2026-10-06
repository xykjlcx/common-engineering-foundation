import { useDeferredValue, useState, type ComponentProps } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PickerPopover } from '@/components/pro/PickerPopover';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { departmentLeaderOptionsQuery } from '../api';
type Props = Pick<ComponentProps<typeof PickerPopover>, 'id' | 'ref' | 'onBlur' | 'disabled'> & {
  value: string | null;
  onChange: (id: string | null) => void;
};
export function DeptLeaderField({ value, ...props }: Props) {
  const { t } = useTranslation('admin');
  const [query, setQuery] = useState('');
  const keyword = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const options = useInfiniteQuery({
    ...departmentLeaderOptionsQuery({ keyword, selectedId: value ?? undefined }),
    enabled: open || value !== null,
  });
  const nodes = [
    ...new Map(
      (
        options.data?.pages.flatMap((page) => [...page.list, ...(page.selected ? [page.selected] : [])]) ?? []
      ).map((row) => [row.id, { value: row.id, label: row.name, code: row.employeeNo ?? undefined }]),
    ).values(),
  ];
  return (
    <PickerPopover
      {...props}
      value={value}
      nodes={nodes}
      open={open}
      onOpenChange={setOpen}
      aria-label={t('depts.fields.leader')}
      placeholder={t('depts.unset')}
      searchMode="remote"
      query={query}
      onQueryChange={setQuery}
      busy={options.isFetching}
      labels={{
        searchPlaceholder: t('depts.leaderSearch'),
        empty: t('depts.leaderEmpty'),
        frequent: t('depts.leaderCandidates'),
        matchHint: (_query, count) => t('depts.leaderMatches', { count }),
      }}
      footer={
        <>
          {value ? (
            <Button
              type="button"
              variant="text"
              disabled={props.disabled}
              onClick={() => props.onChange(null)}
            >
              {t('depts.clear')}
            </Button>
          ) : null}
          {options.isError ? (
            <FieldError>
              {t('depts.leadersFailed')}{' '}
              <Button type="button" variant="text" onClick={() => void options.refetch()}>
                {t('depts.retry')}
              </Button>
            </FieldError>
          ) : null}
          {options.hasNextPage ? (
            <Button
              type="button"
              variant="text"
              disabled={options.isFetching}
              onClick={() => void options.fetchNextPage()}
            >
              {t('depts.moreLeaders')}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
