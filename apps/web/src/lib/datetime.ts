const pad = (value: number) => String(value).padStart(2, '0');

/** ISO 时刻在本地时区的日期（YYYY-MM-DD）。 */
export function localDateOf(iso: string) {
  const date = new Date(iso);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 本地时区某日 00:00 的 ISO 时刻；offsetDays 用于取「结束日的次日零点」作开区间上界。 */
export function localDayStartIso(date: string, offsetDays = 0) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);

  return new Date(year, month - 1, day + offsetDays).toISOString();
}

/** ISO 时刻按本地时区显示为 `YYYY-MM-DD HH:mm[:ss]`。 */
export function formatLocalDateTime(iso: string, { seconds = false } = {}) {
  const date = new Date(iso);
  const time = [date.getHours(), date.getMinutes(), ...(seconds ? [date.getSeconds()] : [])]
    .map(pad)
    .join(':');

  return `${localDateOf(iso)} ${time}`;
}
