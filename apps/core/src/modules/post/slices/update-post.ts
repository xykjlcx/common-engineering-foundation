import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors, BizError } from '../../../kernel/errors.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { eq, sql } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { UpdatePostSchema, PostViewSchema } from '../contract.js';
import { posts } from '../schema.js';
import { lockPost, postViews, postWriteError, replacePostRoles } from '../store.js';

const definition = {
  route: { method: 'PATCH', path: '/posts/{id}', summary: '编辑岗位与默认角色' },
  meta: { perm: POST_PERMS.update },
} satisfies SliceDefinition;

const inputSchema = UpdatePostSchema;
const outputSchema = PostViewSchema;
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const updatePost = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const target = await lockPost(tx.db, input.id);
      if (target.version !== input.version) throw new BizError('post.version_conflict');
      const [before] = await postViews(tx.db, [target]);
      const { id, version: _version, roleIds, ...patch } = input;

      const [row] = await tx.db
        .update(posts)
        .set({ ...patch, version: sql`${posts.version} + 1`, updatedAt: ctx.clock.now() })
        .where(eq(posts.id, id))
        .returning()
        .catch(postWriteError);

      if (!row) throw new BizError('post.not_found');
      if (roleIds !== undefined) await replacePostRoles(tx, id, roleIds);
      const [after] = await postViews(tx.db, [row]);
      ctx.audit.capture({ objectType: 'post', objectId: id, before, after });

      return outputSchema.parse(after);
    });
  });
