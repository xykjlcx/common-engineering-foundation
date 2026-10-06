import type { SchemeResource } from './modules/query-scheme/api.js';
import { UserFiltersJsonSchema } from './modules/user/filter-contract.js';
import { USER_PERMS } from './modules/user/permissions.js';

/**
 * 查询方案资源登记表：与 `errors.ts` 的错误码组合同属装配层。
 * 放在这里而不是 query-scheme 模块内，是为了让"方案机制"不反向依赖任何业务筛选契约。
 * 新增可保存方案的业务在此追加一行，并由 `router.ts` 装配时登记。
 */
export const schemeResources: readonly SchemeResource[] = [
  { key: 'users', permission: USER_PERMS.view, filters: UserFiltersJsonSchema },
];
