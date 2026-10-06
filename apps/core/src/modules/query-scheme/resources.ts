import type * as z from 'zod';
import type { Ctx } from '../../kernel/context.js';
import { ValidationError } from '../../kernel/errors.js';
import { assertPermission } from '../../kernel/middleware.js';

/** 一个可保存查询方案的业务资源：权限码与筛选契约由登记方提供。 */
export interface SchemeResource {
  key: string;
  permission: string;
  filters: z.ZodType<unknown, string>;
}

// 登记表住装配层（src/query-scheme-resources.ts）：本模块只提供机制，不认识任何业务筛选契约。
const resources = new Map<string, SchemeResource>();

export function registerSchemeResources(items: readonly SchemeResource[]): void {
  for (const item of items) resources.set(item.key, item);
}

export function authorizeSchemeResource(ctx: Pick<Ctx, 'isSuperuser' | 'permissions'>, key: string) {
  const resource = resources.get(key);
  if (!resource) throw new ValidationError('query_scheme.resource_invalid');
  if (!ctx.isSuperuser) assertPermission(resource.permission, ctx.permissions);
  return resource;
}

export function validateSchemeFilters(resource: SchemeResource, filters: string) {
  const result = resource.filters.safeParse(filters);
  if (!result.success)
    throw new ValidationError('validation.failed', { field: 'filters', issues: result.error.issues });
  return result.data;
}
