import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors } from '../../../kernel/errors.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { CreatePostSchema, PostViewSchema } from '../contract.js';
import { posts } from '../schema.js';
import { postViews, postWriteError, replacePostRoles } from '../store.js';

const definition = {
  route: { method: 'POST', path: '/posts', summary: '新建岗位' },
  meta: { perm: POST_PERMS.create },
} satisfies SliceDefinition;

const inputSchema = CreatePostSchema;
const outputSchema = PostViewSchema;
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const createPost = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const { roleIds, ...values } = input;
      const now = ctx.clock.now();

      const [row] = await tx.db
        .insert(posts)
        .values({ ...values, id: ctx.idgen(), createdAt: now, updatedAt: now })
        .returning()
        .catch(postWriteError);

      if (!row) throw new Error('post insert returned no row');
      await replacePostRoles(tx, row.id, roleIds);
      const [result] = await postViews(tx.db, [row]);
      ctx.audit.capture({ objectType: 'post', objectId: row.id, before: null, after: result });

      return outputSchema.parse(result);
    });
  });
