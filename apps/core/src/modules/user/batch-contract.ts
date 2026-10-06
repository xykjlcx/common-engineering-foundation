import * as z from 'zod';

/** 同一提交一个目标只能有一个版本；去重后固定锁顺序，保持一次事务语义。 */
export const BatchTargetsSchema = z
  .array(z.object({ id: z.uuid(), version: z.number().int().min(0) }).strict())
  .min(1)
  .max(500)
  .refine(
    (targets) => {
      const versions = new Map<string, number>();
      for (const target of targets) {
        if (versions.has(target.id) && versions.get(target.id) !== target.version) return false;
        versions.set(target.id, target.version);
      }
      return true;
    },
    { error: '同一目标不能提交不同版本' },
  )
  .transform((targets) =>
    [...new Map(targets.map((target) => [target.id, target])).values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  );

export const MoveUsersSchema = z
  .object({
    targets: BatchTargetsSchema,
    deptId: z.uuid().nullable(),
    impactFingerprint: z.string().length(64).optional(),
  })
  .strict();
export const UserMovePreviewSchema = z.object({
  deptId: z.uuid().nullable(),
  deptName: z.string().nullable(),
  companyId: z.uuid().nullable(),
  companyName: z.string().nullable(),
  companyChangeCount: z.number().int().min(0),
  fingerprint: z.string().length(64),
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      fromNodeId: z.uuid().nullable(),
      fromNodeName: z.string().nullable(),
      fromCompanyId: z.uuid().nullable(),
      fromCompanyName: z.string().nullable(),
    }),
  ),
});
