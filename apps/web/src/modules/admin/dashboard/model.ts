import type { z } from 'zod';
import type { DashboardMenuSchema } from './api/schema';

/** 导航 API 已在后端同时验证能力存在性与授权；这里只选择可打开的页面。 */
export function dashboardEntries(rows: z.infer<typeof DashboardMenuSchema>[]) {
  return rows.flatMap((row) =>
    row.type === 'menu' && row.visible && row.path && row.path !== '/admin/dashboard'
      ? [{ id: row.id, path: row.path, label: row.label }]
      : [],
  );
}

export const unassignedUsersFilters = JSON.stringify({
  op: 'and',
  items: [
    { id: 'enabled', field: 'enabled', operator: 'eq', value: 'true' },
    { id: 'roleIds', field: 'roleIds', operator: 'isEmpty', value: null },
  ],
});
