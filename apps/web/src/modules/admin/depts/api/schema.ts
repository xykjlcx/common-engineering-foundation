import {
  DeptViewSchema as CoreDeptViewSchema,
  CreateDeptSchema as CoreCreateDeptSchema,
} from '@keel/core/dept-contract';
import { z } from 'zod';
import { pageResultSchema } from '@/lib/http/contract';

// 部门 DTO 字段取自原型 DeptTree.dc.html：
// - code：详情头「D-0104」
// - enabled：树上「市场部」灰显 + 详情头「启用」徽标
// - headcount / memberCount：详情「编制占用 12 / 15」「成员 12 人（含下级 12）」
export const DeptSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  leaderId: z.string().nullable(),
  enabled: z.boolean(),
  sort: z.number(),
  /** 编制（岗位数上限），板：总账组 12 / 15 的分母 */
  headcount: z.number(),
  /** 直属成员数 */
  memberCount: z.number(),
  /** 含下级成员数，板树上每个节点右侧数字 */
  memberCountWithSub: z.number(),
  createdAt: z.string(),
});

export const DeptDetailSchema = DeptSchema.extend({
  parentName: z.string().nullable(),
  leaderName: z.string().nullable(),
  /** 「财务部 · 总账组」这类祖先路径（不含自身之外的省略），由服务端拼好 */
  path: z.array(z.string()),
});

export const CreateDeptSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  parentId: z.string().nullable().optional(),
  leaderId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  headcount: z.number().int().min(0).optional(),
});

export const UpdateDeptSchema = CreateDeptSchema.partial().strict();

/** 拖拽调整层级：把 id 挂到 parentId 下，可选放在 beforeId 之前 */
export const MoveDeptSchema = z
  .object({
    parentId: z.string().nullable(),
    beforeId: z.string().nullable().optional(),
  })
  .strict();

// 部门成员表（板：成员 / 工号 / 岗位 / 角色 / 加入时间 / 状态）。
// 这里刻意不复用 users 包的 UserDto：部门成员是「用户在部门视角下的投影」，
// 字段集更小，且 depts 包不应反向依赖 users 包的类型。
export const DeptMemberStatusSchema = z.enum(['active', 'probation', 'left']);

export const DeptMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  employeeNo: z.string(),
  position: z.string(),
  roleIds: z.array(z.string()),
  roleNames: z.array(z.string()),
  joinedAt: z.string(),
  status: DeptMemberStatusSchema,
  enabled: z.boolean(),
});

export const DeptMembersPageSchema = pageResultSchema(DeptMemberSchema);

export const DeptMemberIdsSchema = z.object({ userIds: z.array(z.string()).min(1).max(500) }).strict();

export const DeptBatchResultSchema = z.object({ updated: z.number() });

export type DeptDto = z.infer<typeof DeptSchema>;
export type DeptMemberDto = z.infer<typeof DeptMemberSchema>;

export interface DeptMembersQueryParams {
  deptId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  roleId?: string;
  includeSub?: boolean;
}

export const DepartmentSchema = CoreDeptViewSchema;
export const DepartmentFormSchema = CoreCreateDeptSchema;
export type Department = z.infer<typeof DepartmentSchema>;
