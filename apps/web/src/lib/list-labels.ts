import type { TFunction } from 'i18next';

/** 列设置面板（ColumnSettings）的通用文案，取自 common 命名空间的 list.columns。 */
export function columnSettingsLabels(tc: TFunction<'common'>) {
  return {
    trigger: tc('list.columns.trigger'),
    densityTitle: tc('list.columns.density'),
    densities: {
      default: tc('list.columns.densities.default'),
      relaxed: tc('list.columns.densities.relaxed'),
      loose: tc('list.columns.densities.loose'),
    },
    columnsTitle: tc('list.columns.title'),
    summary: (shown: number, total: number) => tc('list.columns.summary', { shown, total }),
    dragHint: tc('list.columns.dragHint'),
    reset: tc('list.columns.reset'),
    persistHint: tc('list.columns.persistHint'),
  };
}
