import { and, eq, or } from 'drizzle-orm';
import type { Ctx, DbExec } from '../../../kernel/context.js';
import { BizError, PermissionError } from '../../../kernel/errors.js';
import { PG_UNIQUE_VIOLATION, violatedConstraint } from '../../../kernel/pg-error.js';
import { QuerySchemeSchema } from '../contract.js';
import { querySchemes } from '../schema.js';

export const readableScheme = (userId: string, resource: string) =>
  and(
    eq(querySchemes.resource, resource),
    or(eq(querySchemes.ownerId, userId), eq(querySchemes.scope, 'shared')),
  );
export function schemeView(ctx: Pick<Ctx, 'userId' | 'isSuperuser'>, row: typeof querySchemes.$inferSelect) {
  const { ownerId: _owner, ...view } = row;
  return QuerySchemeSchema.parse({
    ...view,
    editable: row.ownerId === ctx.userId && (row.scope === 'mine' || ctx.isSuperuser),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
export function assertSchemeSharing(ctx: Pick<Ctx, 'isSuperuser'>, scope: string): void {
  if (scope === 'shared' && !ctx.isSuperuser)
    throw new PermissionError(
      { reason: 'shared_scheme_management_required' },
      'query_scheme.sharing_forbidden',
    );
}
export async function ownScheme(
  ctx: Pick<Ctx, 'userId' | 'isSuperuser'>,
  db: DbExec,
  id: string,
  version: number,
  resource: string,
) {
  const [row] = await db
    .select()
    .from(querySchemes)
    .where(
      and(eq(querySchemes.id, id), eq(querySchemes.ownerId, ctx.userId), eq(querySchemes.resource, resource)),
    )
    .limit(1);
  if (!row) throw new BizError('query_scheme.not_found');
  assertSchemeSharing(ctx, row.scope);
  if (row.version !== version) throw new BizError('query_scheme.version_conflict');
  return row;
}
const SCHEME_NAME_UNIQUE_CONSTRAINT = 'user_scheme_owner_name_idx';

export function schemeWriteError(error: unknown): never {
  if (violatedConstraint(error, PG_UNIQUE_VIOLATION) === SCHEME_NAME_UNIQUE_CONSTRAINT)
    throw new BizError('query_scheme.name_conflict');
  throw error;
}
