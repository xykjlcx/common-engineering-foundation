import { useDeferredValue, useState, type ComponentProps } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userManagerOptionsQuery } from '../api/dictionaries';
import { PickerPopover } from '@/components/pro/PickerPopover';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';

type Props = Pick<
  ComponentProps<typeof PickerPopover>,
  'id' | 'ref' | 'onBlur' | 'aria-describedby' | 'aria-invalid' | 'labels'
> & {
  value: string | null;
  excludeId?: string;
  onChange: (id: string | null) => void;
};
export function UserManagerField({ value, excludeId, ...props }: Props) {
  const { t } = useTranslation('admin');
  const [query, setQuery] = useState('');
  const keyword = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const options = useInfiniteQuery({
    ...userManagerOptionsQuery({ keyword, selectedId: value ?? undefined, excludeId }),
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
      nodes={nodes}
      value={value}
      open={open}
      onOpenChange={(next) => setOpen(next)}
      aria-label={t('users.form.manager')}
      placeholder={t('users.form.unset')}
      searchMode="remote"
      query={query}
      onQueryChange={(next) => setQuery(next)}
      busy={options.isFetching}
      footer={
        <>
          {options.isFetching ? <span role="status">{t('users.detail.loading')}</span> : null}
          {options.isError ? (
            <FieldError>
              {t('users.form.referencesFailed')}{' '}
              <Button type="button" variant="text" onClick={() => void options.refetch()}>
                {t('users.detail.retry')}
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
              {t('users.form.moreManagers')}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
