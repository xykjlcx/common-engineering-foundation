import type { ColumnDef } from '@tanstack/react-table';
import { useTablePrefs, type TablePrefs } from '@/stores/preferences';
import type { ColumnSettingsItem } from './ColumnSettings';

/** 已保存顺序里仍存在的列在前，新增列按定义顺序补到末尾；已删除的列丢弃。 */
export function resolveColumnOrder(savedOrder: readonly string[], columnIds: readonly string[]) {
  return [
    ...savedOrder.filter((id) => columnIds.includes(id)),
    ...columnIds.filter((id) => !savedOrder.includes(id)),
  ];
}

/** ColumnSettings 面板需要的列清单：顺序与可见性来自偏好，标签取列头文字。 */
export function columnSettingsItems<T>(
  columns: readonly ColumnDef<T>[],
  order: readonly string[],
  visibility: TablePrefs['visibility'],
): ColumnSettingsItem[] {
  return order.flatMap((id) => {
    const column = columns.find((item) => item.id === id);
    if (!column) return [];

    return [
      {
        id,
        label: typeof column.header === 'string' ? column.header : id,
        visible: visibility[id] !== false,
      },
    ];
  });
}

interface ColumnPreferencesOptions {
  density: TablePrefs['density'];
  /** 读取本地存档后做一次纠正，例如列 id 改名后把旧偏好映射到新 id。 */
  migrate?: (saved: TablePrefs) => TablePrefs;
}

/**
 * 列表的列偏好：本地存档 + 列定义 → DataTable 的 columnState 与 ColumnSettings 的 items / 回调。
 * 只认带 id 的列；顺序以列定义为准补齐，避免新版本加列后旧存档把新列藏掉。
 */
export function useColumnPreferences<T>(
  tableId: string,
  columns: readonly ColumnDef<T>[],
  { density, migrate }: ColumnPreferencesOptions,
) {
  const columnIds = columns.flatMap((column) => (column.id ? [column.id] : []));
  const stored = useTablePrefs(tableId, { visibility: {}, order: columnIds, sizing: {}, density });
  const prefs = migrate ? migrate(stored.prefs) : stored.prefs;
  const order = resolveColumnOrder(prefs.order, columnIds);

  return {
    prefs,
    setPrefs: stored.setPrefs,
    resetPrefs: stored.resetPrefs,
    columnState: { visibility: prefs.visibility, order, sizing: prefs.sizing },
    columnItems: columnSettingsItems(columns, order, prefs.visibility),
    setColumns: (next: ColumnSettingsItem[]) =>
      stored.setPrefs({
        order: next.map((item) => item.id),
        visibility: Object.fromEntries(next.map((item) => [item.id, item.visible])),
      }),
  };
}
