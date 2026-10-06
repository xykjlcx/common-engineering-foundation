import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UsersSearch } from '../types';
import { TableText } from '@/components/pro/TableText';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Badge } from '@/components/ui/badge';
import type { UserDeptPathNode } from '../api/dictionaries';
import { userDeptPathLabel as deptPathLabel } from '../api/dictionaries';
import { UserAvatar } from '../components/UserAvatar';
import { displayStatus, formatLastLogin, isRowMuted, maskPhone, roleSummary, statusTone } from '../model';
import type { UserDto } from '../api';

interface UserColumnsContext {
  t: TFunction<'admin'>;
  search: UsersSearch;
  now: Date;
  depts: readonly UserDeptPathNode[];
  roleNameById: ReadonlyMap<string, string>;
}

export function userColumns({
  t,
  now,
  depts,
  roleNameById,
  search,
}: UserColumnsContext): ColumnDef<UserDto>[] {
  return [
    {
      id: 'name',
      header: t('users.columns.name'),
      size: 160,
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;
        const muted = isRowMuted(user);

        return (
          <span className="flex min-w-0 items-center gap-[calc(8px*var(--app-scale))]">
            <UserAvatar name={user.name} src={user.avatar} size="row" muted={muted} />
            <Link
              className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'min-w-0 shrink justify-start')}
              to="/admin/users/$userId"
              params={{ userId: user.id }}
              search={{ list: search }}
            >
              <TableText tone="link" muted={muted}>
                {user.name}
              </TableText>
            </Link>
          </span>
        );
      },
    },
    {
      id: 'employeeNo',
      header: t('users.columns.employeeNo'),
      size: 100,
      enableSorting: true,
      cell: ({ row }) => (
        <TableText mono muted={isRowMuted(row.original)} className="block">
          {row.original.employeeNo}
        </TableText>
      ),
    },
    {
      id: 'dept',
      header: t('users.columns.dept'),
      size: 240,
      enableSorting: true,
      meta: { sortField: 'deptId' },
      cell: ({ row }) => (
        <TableText muted={isRowMuted(row.original)} className="block">
          {deptPathLabel(depts, row.original.deptId)}
        </TableText>
      ),
    },
    {
      id: 'postName',
      header: t('users.columns.postName'),
      size: 120,
      enableSorting: true,
      cell: ({ row }) => (
        <TableText muted={isRowMuted(row.original)} className="block">
          {row.original.postName}
        </TableText>
      ),
    },
    {
      id: 'roles',
      header: t('users.columns.roles'),
      size: 270,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        const muted = isRowMuted(user);
        const { primary, extra } = roleSummary(user.roleIds, roleNameById);
        if (!primary) return null;

        return (
          <span className="flex min-w-0 items-center gap-[calc(5px*var(--app-scale))]">
            {/* 板 L109 角色 chip：19px 高 / 0 7px / r3 / #f2f2f0 底 / 11.5px #636361 字，无 dot */}
            <Badge
              variant="neutral"
              className="h-[calc(19px*var(--app-scale))] min-w-0 px-[calc(7px*var(--app-scale))]"
            >
              <TableText muted={muted}>{primary}</TableText>
            </Badge>
            {extra > 0 && (
              <TableText tone="hint" className="shrink-0">
                {t('users.rolesMore', { count: extra })}
              </TableText>
            )}
          </span>
        );
      },
    },
    {
      id: 'phone',
      header: t('users.columns.phone'),
      size: 118,
      enableSorting: false,
      cell: ({ row }) => (
        <TableText mono muted={isRowMuted(row.original)} className="block">
          {maskPhone(row.original.phone)}
        </TableText>
      ),
    },
    {
      id: 'email',
      header: t('users.columns.email'),
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <TableText muted={isRowMuted(row.original)} className="block">
          {row.original.email}
        </TableText>
      ),
    },
    {
      id: 'employmentType',
      header: t('users.columns.employmentType'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <TableText muted={isRowMuted(row.original)} className="block">
          {row.original.employmentType
            ? t(`users.filters.employmentType.${row.original.employmentType}`, {
                defaultValue: row.original.employmentType,
              })
            : '—'}
        </TableText>
      ),
    },
    {
      id: 'workLocation',
      header: t('users.columns.workLocation'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <TableText muted={isRowMuted(row.original)} className="block">
          {row.original.workLocation}
        </TableText>
      ),
    },
    {
      id: 'joinedAt',
      header: t('users.columns.joinedAt'),
      size: 120,
      enableSorting: true,
      cell: ({ row }) => (
        <TableText mono muted={isRowMuted(row.original)} className="block">
          {row.original.joinedAt}
        </TableText>
      ),
    },
    {
      id: 'lastLoginAt',
      header: t('users.columns.lastLogin'),
      size: 142,
      enableSorting: true,
      cell: ({ row }) => (
        <TableText tone="weak" mono muted={isRowMuted(row.original)} className="block">
          {formatLastLogin(row.original.lastLoginAt, now, (key, options) =>
            t(`users.lastLogin.${key}`, options ?? {}),
          )}
        </TableText>
      ),
    },
    {
      id: 'status',
      header: t('users.columns.status'),
      size: 68,
      enableSorting: true,
      cell: ({ row }) => {
        const status = displayStatus(row.original);

        return (
          <StatusBadge tone={statusTone(status)} showDot={false}>
            {t(`users.status.${status}`)}
          </StatusBadge>
        );
      },
    },
  ];
}
