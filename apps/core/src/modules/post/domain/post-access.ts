import { asc, eq, sql, type SQLWrapper } from 'drizzle-orm';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { posts } from '../schema.js';
import { postViews } from '../store.js';

export const postNameSql = (id: SQLWrapper) =>
  sql<string | null>`(select ${posts.name} from ${posts} where ${posts.id} = ${id})`;

export async function postOptions(db: DbExec) {
  return postViews(
    db,
    await db.select().from(posts).orderBy(asc(posts.sort), asc(posts.name), asc(posts.id)),
  );
}

export async function postByName(db: DbExec, name: string) {
  const [row] = await db.select().from(posts).where(eq(posts.name, name));
  if (!row) throw new BizError('post.not_found');
  if (!row.enabled) throw new BizError('post.disabled');

  return row;
}

export async function assertPostAssignable(db: DbExec, id: string | null) {
  if (!id) return;
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).for('share');
  if (!row) throw new BizError('post.not_found');
  if (!row.enabled) throw new BizError('post.disabled');
}
