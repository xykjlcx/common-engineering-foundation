import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

function literals(values: readonly string[]): SQL {
  return sql.raw(values.map((v) => `'${v.replaceAll("'", "''")}'`).join(', '));
}

export function enumCheck(column: PgColumn, values: readonly string[]): SQL {
  return sql`${column} in (${literals(values)})`;
}

export function nullableEnumCheck(column: PgColumn, values: readonly string[]): SQL {
  return sql`${column} is null or ${column} in (${literals(values)})`;
}
