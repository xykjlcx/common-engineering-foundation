/** 持久化审计 action：与 userRouter 叶子同名，不跟随展示路径改名。 */
export const USER_AUDIT_ACTIONS = {
  create: 'user.create',
  update: 'user.update',
  assignRoles: 'user.assignRoles',
  batchRoles: 'user.batchRoles',
  importUsers: 'user.importUsers',
} as const;

/** 历史落库别名：当前为空。读模型继续合并此数组，测试用注入值验证别名路径。 */
export const USER_AUDIT_ACTION_ALIASES: readonly string[] = [];

export function creationAuditActions(
  aliases: readonly string[] = USER_AUDIT_ACTION_ALIASES,
): readonly string[] {
  return [USER_AUDIT_ACTIONS.create, USER_AUDIT_ACTIONS.importUsers, ...aliases];
}

export const USER_CREATION_AUDIT_ACTIONS = creationAuditActions();

export const USER_ROLE_ASSIGNMENT_AUDIT_ACTIONS = [
  USER_AUDIT_ACTIONS.assignRoles,
  USER_AUDIT_ACTIONS.batchRoles,
] as const;
