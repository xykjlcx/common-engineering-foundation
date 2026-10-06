import { eq, inArray } from 'drizzle-orm';
import type { DbExec, TxCtx } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { assertNoPrivilegeEscalation } from '../../kernel/escalation.js';
import { getPermCodesOfRoles, listTemplateRoles } from '../role/api.js';
import { posts, postRoles } from './schema.js';
import { PostViewSchema } from './contract.js';

export function postWriteError(error: unknown): never {
  const constraint = violatedConstraint(error, PG_UNIQUE_VIOLATION);
  if (constraint === 'post_code_unique') throw new BizError('post.code_conflict');
  if (constraint === 'post_name_unique') throw new BizError('post.name_conflict');
  throw error;
}

export async function postViews(db: DbExec, rows: (typeof posts.$inferSelect)[]) {
  if (!rows.length) return [];

  const links = await db
    .select()
    .from(postRoles)
    .where(
      inArray(
        postRoles.postId,
        rows.map((row) => row.id),
      ),
    );

  const roleRows = await listTemplateRoles(
    db,
    links.map((row) => row.roleId),
  );

  return rows.map((row) => {
    const ids = links
      .filter((link) => link.postId === row.id)
      .map((link) => link.roleId)
      .sort();

    return PostViewSchema.parse({
      ...row,
      roleIds: ids,
      roles: roleRows.filter((role) => ids.includes(role.id)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  });
}

export async function lockPost(db: DbExec, id: string) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).for('update');
  if (!row) throw new BizError('post.not_found');

  return row;
}

export async function replacePostRoles(ctx: TxCtx, postId: string, requested: string[]) {
  const ids = [...new Set(requested)].sort();
  const choices = await listTemplateRoles(ctx.db, ids);

  if (choices.length !== ids.length || choices.some((row) => !row.enabled))
    throw new BizError('post.role_unavailable');

  assertNoPrivilegeEscalation(
    ctx.isSuperuser ? { kind: 'all' } : { kind: 'set', codes: ctx.permissions },
    await getPermCodesOfRoles(ctx.db, ids),
  );

  await ctx.db.delete(postRoles).where(eq(postRoles.postId, postId));

  if (ids.length)
    await ctx.db
      .insert(postRoles)
      .values(ids.map((roleId) => ({ postId, roleId, createdAt: ctx.clock.now() })));
}
