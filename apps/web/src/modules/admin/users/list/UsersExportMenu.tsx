import { isDemoBuild } from '@/config';
import { chipCount } from '@/components/pro/filter-builder';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Download } from 'lucide-react';
import { USER_IMPORT_TEMPLATE_COLUMNS, UserExportColumnSchema } from '@keel/core/user-import-contract';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { userApi, type UsersQueryParams } from '../api';
import { parseFilters, parseSort } from '../model';
import { UserImportDialog } from './UserImportDialog';

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function UsersExportMenu({
  search,
  filteredTotal,
  canExport,
  canImport = false,
  columns,
  selectedIds = [],
}: {
  search: UsersQueryParams;
  filteredTotal: number;
  canExport: boolean;
  canImport?: boolean;
  columns?: string[];
  selectedIds?: string[];
}) {
  const exportAllowed = canExport && !isDemoBuild;
  const importAllowed = canImport && !isDemoBuild;
  const { t } = useTranslation('admin');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(false);
  const exporting = useMutation({ mutationFn: userApi.export, gcTime: 0 });
  const run = async (selected: boolean) => {
    if (exporting.isPending || !exportAllowed) return;
    setError(false);
    const order = parseSort(search.sort);
    try {
      if (search.sort && !order) throw new Error('user.invalid_sort');
      const fields = (
        columns ?? ['name', 'employeeNo', 'dept', 'postName', 'roles', 'phone', 'email', 'status']
      ).map((field) => UserExportColumnSchema.parse(field));
      const file = await exporting.mutateAsync({
        keyword: search.keyword,
        filters: search.filters,
        sort: order ? `${order.field}:${order.dir}` : undefined,
        columns: fields,
        ...(selected ? { ids: selectedIds } : {}),
      });
      saveFile(file);
    } catch {
      setError(true);
    } finally {
      exporting.reset();
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            disabled={(!exportAllowed && !importAllowed) || exporting.isPending}
            loading={exporting.isPending}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            {t('users.actions.export')}
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('users.export.title')}</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!exportAllowed}
            onSelect={() => {
              void run(false);
            }}
          >
            {t('users.export.filteredHint', {
              count: filteredTotal,
              conditions: chipCount(parseFilters(search.filters)),
            })}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!exportAllowed || selectedIds.length === 0}
            onSelect={() => {
              void run(true);
            }}
          >
            {t('users.export.selected', { count: selectedIds.length })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!importAllowed} onSelect={() => setImporting(true)}>
            {t('users.import.users')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!importAllowed}
            onSelect={() =>
              saveFile(
                new File(
                  ['\uFEFF' + USER_IMPORT_TEMPLATE_COLUMNS.join(',') + '\r\n'],
                  'user-import-template.csv',
                  { type: 'text/csv;charset=utf-8' },
                ),
              )
            }
          >
            {t('users.import.template')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <span role="alert">{t('users.export.failed')}</span> : null}
      <UserImportDialog
        canImport={importAllowed}
        open={importing}
        onOpenChange={(open) => setImporting(open)}
      />
    </>
  );
}
