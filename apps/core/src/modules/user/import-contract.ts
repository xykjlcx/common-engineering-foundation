import * as z from 'zod';

// UTF-8 CSV 模板；首行是以下字段名，roleIds 用分号分隔，空可选字段映射 null/缺省。
export const USER_IMPORT_TEMPLATE_COLUMNS = [
  'username',
  'name',
  'password',
  'email',
  'phone',
  'employeeNo',
  'deptId',
  'managerId',
  'roleIds',
  'postName',
  'gender',
  'employmentType',
  'employmentStatus',
  'joinedAt',
  'workLocation',
  'remark',
  'mustChangePassword',
  'effectiveAt',
] as const;
export const UserImportInputSchema = z.object({ rows: z.array(z.unknown()).min(1).max(100) }).strict();
export const UserImportIssueSchema = z.object({ field: z.string(), code: z.string() }).strict();
export const UserImportRowResultSchema = z
  .object({
    row: z.number().int().positive(),
    issues: z.array(UserImportIssueSchema),
  })
  .strict();
export const UserImportPreviewSchema = z
  .object({ valid: z.boolean(), rows: z.array(UserImportRowResultSchema) })
  .strict();
export const UserImportResultSchema = z
  .object({
    created: z.array(z.object({ row: z.number().int().positive(), id: z.uuid() }).strict()),
  })
  .strict();
export const UserExportColumnSchema = z.enum([
  'dept',
  'roles',
  'status',
  'username',
  'name',
  'email',
  'phone',
  'employeeNo',
  'deptId',
  'managerId',
  'postName',
  'gender',
  'employmentType',
  'employmentStatus',
  'joinedAt',
  'workLocation',
  'remark',
  'accountStatus',
  'roleIds',
  'mustChangePassword',
  'effectiveAt',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
]);
export type UserImportIssue = z.infer<typeof UserImportIssueSchema>;
