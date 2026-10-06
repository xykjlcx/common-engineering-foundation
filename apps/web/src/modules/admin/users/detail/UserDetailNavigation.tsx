import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TableText } from '@/components/pro/TableText';
import { usersQuery } from '../api';
import { detailNeighbor } from '../model';
import type { UsersSearch } from '../types';

export function UserDetailNavigation({
  userId,
  search,
  onNavigate,
}: {
  userId: string;
  search: UsersSearch;
  onNavigate: (id: string, search: UsersSearch) => void;
}) {
  const { t } = useTranslation('admin');
  const client = useQueryClient();
  const result = useQuery(usersQuery(search));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = result.data;

  const neighbor = (direction: -1 | 1) =>
    page && !result.isPlaceholderData && !result.isError && page.page === search.page
      ? detailNeighbor(page.list, userId, direction, search.page, search.pageSize, page.total)
      : null;

  const navigate = async (direction: -1 | 1) => {
    const next = neighbor(direction);
    if (!next || pending) return;
    setPending(true);
    setFailed(false);

    try {
      let id = next.id;

      if (!id) {
        const adjacent = await client.fetchQuery(usersQuery({ ...search, page: next.page }));
        id = (direction === 1 ? adjacent.list[0] : adjacent.list.at(-1))?.id;
      }

      if (id) onNavigate(id, { ...search, page: next.page });
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const rowIndex = page?.list.findIndex((row) => row.id === userId) ?? -1;
  const position = page && rowIndex >= 0 ? (search.page - 1) * search.pageSize + rowIndex + 1 : null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || !neighbor(-1)}
        title={!neighbor(-1) ? t('users.detail.boundary') : undefined}
        onClick={() => void navigate(-1)}
      >
        <ChevronLeft data-icon="inline-start" aria-hidden="true" />
        {t('users.detail.previousUser')}
      </Button>
      {position !== null && page && (
        <TableText tone="weak" mono>
          {position} / {page.total}
        </TableText>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || !neighbor(1)}
        title={!neighbor(1) ? t('users.detail.boundary') : undefined}
        onClick={() => void navigate(1)}
      >
        {t('users.detail.nextUser')}
        <ChevronRight data-icon="inline-end" aria-hidden="true" />
      </Button>
      {(failed || result.isError) && (
        <TableText role="alert" tone="danger">
          {t('users.detail.navigationFailed')}
        </TableText>
      )}
      {result.isError && (
        <Button variant="ghost" size="sm" onClick={() => void result.refetch()}>
          {t('users.retry')}
        </Button>
      )}
    </div>
  );
}
