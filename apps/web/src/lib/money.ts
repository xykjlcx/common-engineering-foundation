// 金额展示统一走这里。locale 固定 zh-CN：金额栏位的分组与符号位置属于业务口径，
// 不随界面语言切换（改成 i18n.language 会改变 en-US 下的既有输出）。
const formatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });

export function money(value: number) {
  return formatter.format(value);
}
