import { RoleDetailSchema, CreateRoleSchema } from '@keel/core/role-contract';
import type { z } from 'zod';
import type { rpc } from '@/lib/rpc/client';
import { BizError } from '@/lib/http/errors';
let data: Map<string, z.infer<typeof RoleDetailSchema>> | undefined;
const rows = () => (data ??= new Map<string, z.infer<typeof RoleDetailSchema>>());
const fail = (code: string, status = 409): never => {
  throw new BizError({ code, status, traceId: null, instance: null, retryAfter: null });
};
const current = (id: string, version?: number) => {
  const row = rows().get(id);
  if (!row) return fail('role.not_found', 404);
  if (version !== undefined && row.version !== version) return fail('role.version_conflict');
  return row;
};
export const demoRole: Pick<
  typeof rpc.role,
  'list' | 'detail' | 'grantCatalog' | 'create' | 'update' | 'delete' | 'assignMenus'
> = {
  list: (input) =>
    Promise.resolve({
      list: [...rows().values()]
        .map((row) => ({ ...row, memberCount: row.memberCount ?? 0 }))
        .slice(((input.page ?? 1) - 1) * (input.pageSize ?? 20), (input.page ?? 1) * (input.pageSize ?? 20)),
      total: rows().size,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    }),
  detail: async ({ id }) => current(id),
  grantCatalog: () => Promise.resolve([]),
  create: async (input) => {
    const values = CreateRoleSchema.parse(input);
    if ([...rows().values()].some((row) => row.name === values.name)) return fail('role.name_conflict');
    const row = RoleDetailSchema.parse({
      ...values,
      id: crypto.randomUUID(),
      type: 'custom',
      version: 0,
      createdAt: new Date().toISOString(),
      menuIds: [],
      memberCount: 0,
    });
    rows().set(row.id, row);
    return row;
  },
  update: async ({ id, version, ...patch }) => {
    const row = { ...current(id, version), ...patch, version: version + 1 };
    rows().set(id, row);
    return { ...row, updatedAt: new Date().toISOString() };
  },
  delete: async ({ id, version }) => {
    current(id, version);
    rows().delete(id);
    return { id };
  },
  assignMenus: async ({ id, version, menuIds }) => {
    const row = { ...current(id, version), menuIds, version: version + 1 };
    rows().set(id, row);
    return { id, menuIds, version: row.version };
  },
};
