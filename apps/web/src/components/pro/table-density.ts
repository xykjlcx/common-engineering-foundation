/** 表格行高三档（DSFoundations 1.5）：default 32 数据行 / relaxed 34 成员·日志行（含 20px 头像或多 badge）/ loose 44 含输入或 logo。
 *  值住 tokens.base（--table-row-h / -relaxed / -loose），消费方只经 density prop 切换，不得自改几何 token。 */
export type TableDensity = 'default' | 'relaxed' | 'loose';

export const tableDensityClassName: Record<TableDensity, string | undefined> = {
  default: undefined,
  relaxed: '[--table-row-h:var(--table-row-h-relaxed)]',
  loose: '[--table-row-h:var(--table-row-h-loose)]',
};
