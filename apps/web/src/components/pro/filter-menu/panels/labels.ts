// 二级选值面板的文案契约（pro 层零文案：全部由业务层注入）。
// 单独成文件让四个子面板与分发器都能引用，避免 FilterValuePanel ↔ panels 的循环依赖。
import type { QuickRangeKey } from '../date-range';

export interface FilterValuePanelLabels {
  /** 选项列表的搜索占位（部门树用 field.pickerLabels.searchPlaceholder，不吃这条） */
  searchPlaceholder: string;
  includeSub: string;
  commitHint: string;
  quickRanges: { key: QuickRangeKey; label: string }[];
  rangeFrom: string;
  rangeTo: string;
  /**
   * dateRange 面板里日历的语言（BCP-47，如 'zh-CN'）。给了才本地化星期 / 月份 / 年份文案，
   * 不给就是 DayPicker 内置英文——pro 层不做 i18n，这条只能由业务层注入 `i18n.language`。
   */
  calendarLocale?: string;
  textOps: { contains: string; eq: string; isEmpty: string };
  enterHint: string;
  /** text 面板输入框尾部「清空」钮的可访问名：清空即撤掉本条件并收起菜单 */
  clearText: string;
  empty: string;
}
