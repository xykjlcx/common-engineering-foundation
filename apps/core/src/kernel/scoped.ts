import { sql, type SQL } from 'drizzle-orm';

/** 恒假条件：归属依据缺失时的唯一合法兜底（fail-closed，绝不放行全量） */
export function denyAll(): SQL {
  return sql`false`;
}

/** 可见性构造器的业务条件入参；与结构条件 AND 合并 */
export interface ScopedOptions {
  where?: SQL;
}
