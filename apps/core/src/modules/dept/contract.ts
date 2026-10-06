import * as z from 'zod';
// 编码区分大小写，应用 trim 与 DB 唯一约束一致；未设置用 null，多个部门可不设编码。
const CodeSchema = z.string().trim().min(1).max(32).nullable();
const HeadcountSchema = z.number().int().min(0).max(2147483647).nullable();
export const OrganizationKindSchema = z.enum(['company', 'department']);
export const OrganizationReferenceSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  name: z.string(),
  kind: OrganizationKindSchema,
  enabled: z.boolean(),
  effectiveEnabled: z.boolean(),
  companyId: z.uuid().nullable(),
  companyName: z.string().nullable(),
});
export const DeptViewSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  name: z.string(),
  kind: OrganizationKindSchema,
  companyId: z.uuid().nullable(),
  companyName: z.string().nullable(),
  effectiveEnabled: z.boolean(),
  code: CodeSchema,
  leaderId: z.uuid().nullable(),
  leaderName: z.string().nullable(),
  headcount: HeadcountSchema,
  /** 直属、未注销账号数，不递归、不以编制数替代实际成员数。 */
  memberCount: z.number().int().min(0),
  memberCountWithSub: z.number().int().min(0),
  enabled: z.boolean(),
  sort: z.number().int(),
  version: z.number().int().min(0),
});
export const CreateDeptSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    kind: OrganizationKindSchema.default('department'),
    code: CodeSchema.default(null),
    leaderId: z.uuid().nullable().default(null),
    headcount: HeadcountSchema.default(null),
    parentId: z.uuid().nullable().default(null),
    sort: z.number().int().default(0),
    enabled: z.boolean().default(true),
  })
  .strict();
export const UpdateDeptSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().min(0),
    name: z.string().trim().min(1).max(64).optional(),
    kind: OrganizationKindSchema.optional(),
    impactFingerprint: z.string().length(64).optional(),
    code: CodeSchema.optional(),
    leaderId: z.uuid().nullable().optional(),
    headcount: HeadcountSchema.optional(),
    parentId: z.uuid().nullable().optional(),
    sort: z.number().int().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (input) =>
      ['name', 'kind', 'code', 'leaderId', 'headcount', 'parentId', 'enabled', 'sort'].some(
        (key) => Reflect.get(input, key) !== undefined,
      ),
    { error: '至少需要一个待更新字段' },
  );
export const DeptChangePreviewSchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  parentId: z.uuid().nullable(),
  kind: OrganizationKindSchema,
  companyId: z.uuid().nullable(),
  companyName: z.string().nullable(),
  descendantCount: z.number().int().min(0),
  memberCount: z.number().int().min(0),
  affectedMemberCount: z.number().int().min(0),
  companyChanges: z.array(
    z.object({
      nodeId: z.uuid(),
      name: z.string(),
      fromCompanyId: z.uuid().nullable(),
      fromCompanyName: z.string().nullable(),
      toCompanyId: z.uuid().nullable(),
      toCompanyName: z.string().nullable(),
      memberCount: z.number().int().min(0),
    }),
  ),
  fingerprint: z.string().length(64),
});
export const DeptReferencesSchema = z.object({
  children: z.array(z.object({ id: z.uuid(), name: z.string(), kind: OrganizationKindSchema })),
  memberCount: z.number().int().min(0),
  archivedMemberCount: z.number().int().min(0),
  roles: z.array(z.object({ id: z.uuid(), name: z.string() })),
});
export const DeptLeaderSchema = z
  .object({ id: z.uuid(), name: z.string(), employeeNo: z.string().nullable() })
  .strict();
export const DeptLeaderQuerySchema = z
  .object({
    keyword: z.string().trim().max(64).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(30),
    selectedId: z.uuid().optional(),
  })
  .strict();
