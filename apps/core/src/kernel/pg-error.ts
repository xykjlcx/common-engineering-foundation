/** PostgreSQL 唯一约束（含唯一索引）冲突的 SQLSTATE。 */
export const PG_UNIQUE_VIOLATION: readonly string[] = ['23505'];

/** 引用约束错误：本地 PG 16 的 RESTRICT 返回 23503，PGlite 返回 23001。 */
export const PG_REFERENCE_VIOLATION: readonly string[] = ['23001', '23503'];

/** Drizzle 包装驱动异常，SQLSTATE 与约束名需沿 cause 查找。 */
export function violatedConstraint(error: unknown, sqlStates: readonly string[]): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return null;
    if (
      'code' in current &&
      typeof current.code === 'string' &&
      sqlStates.includes(current.code) &&
      'constraint' in current &&
      typeof current.constraint === 'string'
    ) {
      return current.constraint;
    }
    current = 'cause' in current ? current.cause : null;
  }
  return null;
}
