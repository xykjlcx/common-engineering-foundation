import { USER_IMPORT_TEMPLATE_COLUMNS } from '@keel/core/user-import-contract';

/** 有界CSV状态机：引号内换行/双引号转义保留，坏行不补列、不静默跳过。 */
export function parseUserImportCsv(source: string): Record<string, unknown>[] {
  if (source.length > 1_048_576) throw new Error('users.import.fileTooLarge');
  const csv = source.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false,
    closed = false;
  const field = () => {
    row.push(value);
    value = '';
    closed = false;
  };
  const record = () => {
    field();
    if (row.some((item) => item !== '')) records.push(row);
    row = [];
  };
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else value += char;
    } else if (char === '"' && value === '' && !closed) quoted = true;
    else if (char === ',') field();
    else if (char === '\n' || char === '\r') {
      record();
      if (char === '\r' && csv[i + 1] === '\n') i++;
    } else if (closed || char === '"') throw new Error('users.import.invalidCsv');
    else value += char;
    if (records.length > 101) throw new Error('users.import.tooManyRows');
  }
  if (quoted) throw new Error('users.import.invalidCsv');
  if (value || row.length || closed) record();
  const header = records.shift()?.map((key) => key.trim());
  if (!header || !records.length || records.length > 100 || new Set(header).size !== header.length)
    throw new Error('users.import.invalidCsv');
  const allowed = new Set<string>(USER_IMPORT_TEMPLATE_COLUMNS);
  if (
    header.some((key) => !allowed.has(key)) ||
    !['username', 'name', 'password'].every((key) => header.includes(key))
  )
    throw new Error('users.import.invalidCsv');
  return records.map((cells) => {
    if (cells.length !== header.length) throw new Error('users.import.invalidCsv');
    return Object.fromEntries(
      header.map((key, index): [string, unknown] => {
        const raw = cells[index] ?? '',
          value = key === 'password' ? raw : raw.trim();
        if (key === 'roleIds') return [key, value ? value.split(';').map((id) => id.trim()) : []];
        if (key === 'mustChangePassword')
          return [key, value === '' || value === 'true' ? true : value === 'false' ? false : value];
        if (value === '' && !['username', 'name', 'password', 'phone'].includes(key)) return [key, null];
        return [key, value];
      }),
    );
  });
}
