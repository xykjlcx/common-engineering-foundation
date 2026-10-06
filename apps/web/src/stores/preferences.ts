import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColumnSizingState, VisibilityState } from '@tanstack/react-table';
import type { TableDensity } from '@/components/pro/table-density';

export interface TablePrefs {
  visibility: VisibilityState;
  order: string[];
  /** 列宽（列 id → px），拖过的列才有键；重置即清空回默认宽 */
  sizing: ColumnSizingState;
  density: TableDensity;
}

interface PreferencesStore {
  tables: Record<string, TablePrefs>;
  setTablePrefs: (tableId: string, patch: Partial<TablePrefs>) => void;
  resetTablePrefs: (tableId: string, defaults: TablePrefs) => void;
}

const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      tables: {},
      setTablePrefs: (tableId, patch) =>
        set((state) => ({
          tables: {
            ...state.tables,
            [tableId]: {
              visibility: patch.visibility ?? state.tables[tableId]?.visibility ?? {},
              order: patch.order ?? state.tables[tableId]?.order ?? [],
              sizing: patch.sizing ?? state.tables[tableId]?.sizing ?? {},
              density: patch.density ?? state.tables[tableId]?.density ?? 'default',
            },
          },
        })),
      resetTablePrefs: (tableId, defaults) =>
        set((state) => ({
          tables: { ...state.tables, [tableId]: defaults },
        })),
    }),
    { name: 'keel.table-prefs' },
  ),
);

export function clearTablePrefsStore() {
  usePreferencesStore.setState({ tables: {} });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('keel.table-prefs');
}

export function useTablePrefs(tableId: string, defaults: TablePrefs) {
  const stored = usePreferencesStore((state) => state.tables[tableId]);
  const setTablePrefs = usePreferencesStore((state) => state.setTablePrefs);
  const resetTablePrefs = usePreferencesStore((state) => state.resetTablePrefs);
  const prefs: TablePrefs = {
    visibility: stored?.visibility ?? defaults.visibility,
    order: stored?.order?.length ? stored.order : defaults.order,
    // 旧版本地存档没有 sizing 字段，回落默认
    sizing: stored?.sizing ?? defaults.sizing,
    density: stored?.density ?? defaults.density,
  };
  return {
    prefs,
    setPrefs: (patch: Partial<TablePrefs>) => setTablePrefs(tableId, { ...prefs, ...patch }),
    resetPrefs: () => resetTablePrefs(tableId, defaults),
  };
}
