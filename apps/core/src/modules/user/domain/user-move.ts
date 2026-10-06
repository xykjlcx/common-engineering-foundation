import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { TxCtx } from '../../../kernel/context.js';
import { BizError, PermissionError } from '../../../kernel/errors.js';
import { getDepartments, lockDepartmentTree } from '../../dept/api.js';
import type { MoveUsersSchema } from '../batch-contract.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { assertProfileReferences } from './user-profile.js';

export async function previewUserMove(ctx: TxCtx, input: z.infer<typeof MoveUsersSchema>) {
  await lockDepartmentTree(ctx.db);
  const nodes = await getDepartments(ctx.db);
  const targetNode = nodes.find((node) => node.id === input.deptId);
  const items = [];
  const versions = [];
  for (const target of input.targets) {
    const [user] = await visibleUsers(ctx, { where: eq(appUsers.id, target.id) }).limit(1);
    if (!user) throw new BizError('user.not_found');
    if (user.id === ctx.userId || user.isSystemAdmin)
      throw new PermissionError({ reason: 'protected_department_target' });
    if (user.version !== target.version) throw new BizError('user.version_conflict');
    await assertProfileReferences(ctx, { deptId: input.deptId }, user.id);
    const sourceNode = nodes.find((node) => node.id === user.deptId);
    items.push({
      id: user.id,
      name: user.name,
      fromNodeId: user.deptId,
      fromNodeName: sourceNode?.name ?? null,
      fromCompanyId: sourceNode?.companyId ?? null,
      fromCompanyName: sourceNode?.companyName ?? null,
    });
    versions.push({ id: user.id, version: user.version });
  }
  const result = {
    deptId: input.deptId,
    deptName: targetNode?.name ?? null,
    companyId: targetNode?.companyId ?? null,
    companyName: targetNode?.companyName ?? null,
    companyChangeCount: items.filter(
      (item) => item.fromCompanyId && targetNode?.companyId && item.fromCompanyId !== targetNode.companyId,
    ).length,
    items,
  };
  return {
    ...result,
    fingerprint: createHash('sha256')
      .update(JSON.stringify({ ...result, versions }))
      .digest('hex'),
  };
}
