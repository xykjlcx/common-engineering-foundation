import type { rpc } from '@/lib/rpc/client';
import { DeptViewSchema } from '@keel/core/dept-contract';
import type { z } from 'zod';
import { BizError } from '@/lib/http/errors';
let values: Map<string, z.infer<typeof DeptViewSchema>> | undefined;
const rows = () => (values ??= new Map<string, z.infer<typeof DeptViewSchema>>());
const fail = (code: string, status = 409): never => {
  throw new BizError({ code, status, instance: null, traceId: null, retryAfter: null });
};
type Node = z.infer<typeof DeptViewSchema>;
function context(nodes: readonly Node[], id: string) {
  let current = nodes.find((node) => node.id === id);
  let company: Node | undefined;
  let effectiveEnabled = true;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    effectiveEnabled &&= current.enabled;
    if (!company && current.kind === 'company') company = current;
    current = nodes.find((node) => node.id === current?.parentId);
  }
  return { companyId: company?.id ?? null, companyName: company?.name ?? null, effectiveEnabled };
}
function position(node: Node) {
  const nodes = [...rows().values()];
  if (!node.parentId) {
    if (node.kind !== 'company') fail('dept.invalid_hierarchy', 422);
    if (nodes.some((other) => other.id !== node.id && !other.parentId && other.kind === 'company'))
      fail('dept.root_exists', 422);
  } else {
    const parent = rows().get(node.parentId) ?? fail('dept.not_found', 404);
    if (node.kind === 'company' && parent.kind !== 'company') fail('dept.invalid_hierarchy', 422);
    const seen = new Set([node.id]);
    let current: Node | undefined = parent;
    while (current) {
      if (seen.has(current.id)) fail('dept.parent_cycle', 422);
      seen.add(current.id);
      current = rows().get(current.parentId ?? '');
    }
  }
  if (
    node.kind === 'department' &&
    nodes.some((other) => other.parentId === node.id && other.kind === 'company')
  )
    fail('dept.invalid_hierarchy', 422);
}
function projected() {
  const nodes = [...rows().values()];
  return nodes.map((node) => ({ ...node, ...context(nodes, node.id) }));
}
async function fingerprint(value: unknown) {
  return [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))),
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
async function preview(input: Parameters<typeof rpc.dept.preview>[0]) {
  const row = rows().get(input.id) ?? fail('dept.not_found', 404);
  if (row.version !== input.version) fail('dept.version_conflict');
  const next = { ...row, ...input };
  position(next);
  if (
    next.parentId !== row.parentId &&
    next.parentId &&
    !context([...rows().values()], next.parentId).effectiveEnabled
  )
    fail('dept.disabled', 422);
  const subtree = new Set([row.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of rows().values())
      if (node.parentId && subtree.has(node.parentId) && !subtree.has(node.id)) {
        subtree.add(node.id);
        changed = true;
      }
  }
  const nodes = [...rows().values()];
  const after = nodes.map((node) => (node.id === row.id ? next : node));
  const companyChanges = nodes
    .filter((node) => subtree.has(node.id))
    .flatMap((node) => {
      const from = context(nodes, node.id),
        to = context(after, node.id);
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
              memberCount: node.memberCount,
            },
          ];
    });
  return {
    id: row.id,
    version: row.version,
    parentId: next.parentId,
    kind: next.kind,
    ...context(after, row.id),
    descendantCount: subtree.size - 1,
    memberCount: nodes
      .filter((node) => subtree.has(node.id))
      .reduce((sum, node) => sum + node.memberCount, 0),
    affectedMemberCount: companyChanges.reduce((sum, node) => sum + node.memberCount, 0),
    companyChanges,
    fingerprint: await fingerprint({ nodes, parentId: next.parentId, kind: next.kind, name: next.name }),
  };
}
export const demoDept: Pick<
  typeof rpc.dept,
  'detail' | 'leaderOptions' | 'tree' | 'create' | 'update' | 'delete' | 'preview' | 'references'
> = {
  preview,
  references: async ({ id }) => ({
    children: [...rows().values()]
      .filter((row) => row.parentId === id)
      .map(({ id, name, kind }) => ({ id, name, kind })),
    memberCount: 0,
    archivedMemberCount: 0,
    roles: [],
  }),
  tree: () => Promise.resolve(projected()),
  detail: async ({ id }) => projected().find((node) => node.id === id) ?? fail('dept.not_found', 404),
  leaderOptions: () => Promise.resolve({ list: [], total: 0, selected: null }),
  create: async (input) => {
    const id = crypto.randomUUID();
    if (input.parentId && !rows().has(input.parentId)) fail('dept.not_found', 404);
    const node = DeptViewSchema.parse({
      ...input,
      id,
      parentId: input.parentId ?? null,
      enabled: input.enabled ?? true,
      sort: input.sort ?? 0,
      version: 0,
      code: input.code ?? null,
      leaderId: input.leaderId ?? null,
      leaderName: null,
      headcount: input.headcount ?? null,
      memberCount: 0,
      memberCountWithSub: 0,
      kind: input.kind ?? 'department',
      effectiveEnabled: input.enabled ?? true,
      companyId: input.kind === 'company' ? id : (rows().get(input.parentId ?? '')?.companyId ?? null),
      companyName:
        input.kind === 'company' ? input.name : (rows().get(input.parentId ?? '')?.companyName ?? null),
    });
    position(node);
    if (node.parentId && !context([...rows().values()], node.parentId).effectiveEnabled)
      fail('dept.disabled', 422);
    rows().set(id, node);
    return { id, version: 0 };
  },
  update: async ({ id, version, ...patch }) => {
    const row = rows().get(id);
    if (!row) return fail('dept.not_found', 404);
    if (row.version !== version) return fail('dept.version_conflict');
    const impact = await preview({ id, version, ...patch });
    if (
      (patch.kind !== undefined || patch.parentId !== undefined) &&
      (impact.companyChanges.length || patch.impactFingerprint) &&
      impact.fingerprint !== patch.impactFingerprint
    )
      fail('dept.impact_changed');
    const { impactFingerprint: _fingerprint, ...values } = patch;
    rows().set(id, { ...row, ...values, version: version + 1 });
    return { id, version: version + 1 };
  },
  delete: async ({ id, version }) => {
    const row = rows().get(id);
    if (!row) return fail('dept.not_found', 404);
    if (row.version !== version) return fail('dept.version_conflict');
    if ([...rows().values()].some((node) => node.parentId === id)) return fail('dept.in_use');
    rows().delete(id);
    return { id };
  },
};
