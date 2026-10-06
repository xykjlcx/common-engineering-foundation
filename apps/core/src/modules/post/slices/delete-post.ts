import * as z from 'zod';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors, BizError } from '../../../kernel/errors.js';
import { countPostReferences } from '../../user/api.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { eq } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { VersionedPostSchema } from '../contract.js';
import { posts } from '../schema.js';
import { lockPost, postViews } from '../store.js';

const definition = {
  route: { method: 'DELETE', path: '/posts/{id}', summary: '删除岗位' },
  meta: { perm: POST_PERMS.delete },
} satisfies SliceDefinition;

const inputSchema = VersionedPostSchema;
const outputSchema = z.object({ id: z.uuid() });
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const deletePost = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const target = await lockPost(tx.db, input.id);
      if (target.version !== input.version) throw new BizError('post.version_conflict');
      const count = await countPostReferences(tx.db, input.id);
      if (count) throw new BizError('post.in_use', { count });
      const [before] = await postViews(tx.db, [target]);
      await tx.db.delete(posts).where(eq(posts.id, input.id));
      ctx.audit.capture({ objectType: 'post', objectId: input.id, before, after: null });

      return outputSchema.parse({ id: input.id });
    });
  });
