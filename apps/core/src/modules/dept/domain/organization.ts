import { createHash } from 'node:crypto';
import type { z } from 'zod';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { countUsersOfDepartments } from '../../user/api.js';
import type { UpdateDeptSchema } from '../contract.js';
import type { depts } from '../schema.js';
import { departmentDescendants, getDepartments } from './dept-access.js';

type Node = Pick<typeof depts.$inferSelect, 'id' | 'name' | 'parentId' | 'kind' | 'enabled'>;

export function organizationContext(nodes: readonly Node[], id: string) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  let current = byId.get(id);
  let company: Node | undefined;
  let effectiveEnabled = current !== undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (!company && current.kind === 'company') company = current;
    effectiveEnabled &&= current.enabled;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return { companyId: company?.id ?? null, companyName: company?.name ?? null, effectiveEnabled };
}

export function assertOrganizationPosition(nodes: readonly Node[], node: Node) {
  if (node.parentId === null) {
    if (node.kind !== 'company') throw new BizError('dept.invalid_hierarchy');
    if (nodes.some((other) => other.id !== node.id && other.parentId === null && other.kind === 'company'))
      throw new BizError('dept.root_exists');
  } else {
    const parent = nodes.find((other) => other.id === node.parentId);
    if (!parent) throw new BizError('dept.not_found');
    if (node.kind === 'company' && parent.kind !== 'company') throw new BizError('dept.invalid_hierarchy');
    const seen = new Set([node.id]);
    let current: Node | undefined = parent;
    while (current) {
      if (seen.has(current.id)) throw new BizError('dept.parent_cycle');
      seen.add(current.id);
      current = current.parentId ? nodes.find((other) => other.id === current?.parentId) : undefined;
    }
  }
  if (
    node.kind === 'department' &&
    nodes.some((other) => other.parentId === node.id && other.kind === 'company')
  )
    throw new BizError('dept.invalid_hierarchy');
}

export async function previewOrganizationChange(db: DbExec, input: z.infer<typeof UpdateDeptSchema>) {
  const nodes = await getDepartments(db);
  const before = nodes.find((node) => node.id === input.id);
  if (!before) throw new BizError('dept.not_found');
  if (before.version !== input.version) throw new BizError('dept.version_conflict');
  const after = {
    ...before,
    name: input.name ?? before.name,
    kind: input.kind ?? before.kind,
    parentId: input.parentId === undefined ? before.parentId : input.parentId,
  };
  assertOrganizationPosition(nodes, after);
  if (
    after.parentId !== before.parentId &&
    after.parentId &&
    !organizationContext(nodes, after.parentId).effectiveEnabled
  )
    throw new BizError('dept.disabled');
  const subtree = await departmentDescendants(db, [input.id]);
  const counts = await countUsersOfDepartments(db, subtree);
  const nextNodes = nodes.map((node) => (node.id === input.id ? after : node));
  const changedNodes = nodes
    .filter((node) => subtree.includes(node.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const companyChanges = changedNodes.flatMap((node) => {
    const from = organizationContext(nodes, node.id);
    const to = organizationContext(nextNodes, node.id);
    return from.companyId === to.companyId
      ? []
      : [
          {
            nodeId: node.id,
            name: node.name,
            fromCompanyId: from.companyId,
            fromCompanyName: from.companyName,
            toCompanyId: to.companyId,
            toCompanyName: to.companyName,
            memberCount: counts.get(node.id) ?? 0,
          },
        ];
  });
  const material = {
    id: input.id,
    version: input.version,
    parentId: after.parentId,
    kind: after.kind,
    nodes: changedNodes.map((node) => ({
      id: node.id,
      version: node.version,
      members: counts.get(node.id) ?? 0,
    })),
    companyChanges,
  };
  return {
    id: input.id,
    version: input.version,
    parentId: after.parentId,
    kind: after.kind,
    ...organizationContext(nextNodes, input.id),
    descendantCount: subtree.length - 1,
    memberCount: subtree.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0),
    affectedMemberCount: companyChanges.reduce((sum, change) => sum + change.memberCount, 0),
    companyChanges,
    fingerprint: createHash('sha256').update(JSON.stringify(material)).digest('hex'),
  };
}
