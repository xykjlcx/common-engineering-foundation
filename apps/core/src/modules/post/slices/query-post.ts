import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors, BizError } from '../../../kernel/errors.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { eq } from 'drizzle-orm';
import { PostViewSchema } from '../contract.js';
import { posts } from '../schema.js';
import { postViews } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/posts/{id}', summary: '岗位详情' },
  meta: { perm: POST_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();
const outputSchema = PostViewSchema;
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const queryPost = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const rows = await ctx.db.select().from(posts).where(eq(posts.id, input.id));
    const [result] = await postViews(ctx.db, rows);
    if (!result) throw new BizError('post.not_found');

    return result;
  });
