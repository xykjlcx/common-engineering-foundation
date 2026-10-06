import { KERNEL_ERROR_CODES, PermissionError } from './errors.js';

// 任何人不能授出自己没有的权限。

export type ActorPermissions = { kind: 'all' } | { kind: 'set'; codes: ReadonlySet<string> };

export function assertNoPrivilegeEscalation(actor: ActorPermissions, grantedCodes: readonly string[]): void {
  if (actor.kind === 'all') return;
  const exceeded = grantedCodes.filter((code) => !actor.codes.has(code));
  if (exceeded.length > 0) {
    throw new PermissionError(
      { exceeded: [...new Set(exceeded)].sort() },
      KERNEL_ERROR_CODES.ESCALATION_DENIED,
    );
  }
}

/** 自我授权防护：不能给自己分配角色（否则子集规则可被"先授给自己再层层放大"绕开） */
export function assertNotGrantingSelf(actorId: string, targetUserId: string): void {
  if (actorId === targetUserId) {
    throw new PermissionError({ actorId }, KERNEL_ERROR_CODES.SELF_GRANT_FORBIDDEN);
  }
}
