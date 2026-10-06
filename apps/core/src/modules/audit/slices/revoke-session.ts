import * as z from 'zod';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { runCommand } from '../../../kernel/command.js';
import { BizError, PermissionError, commonErrorContracts, kernelErrors } from '../../../kernel/errors.js';
import { assertNoPrivilegeEscalation } from '../../../kernel/escalation.js';
import { getManagedSession, revokeManagedSession } from '../../auth/api.js';
import { getAuthUserById, getRoleIdsOfUser } from '../../user/api.js';
import { getPermCodesOfRoles } from '../../role/api.js';
import { AUDIT_PERMS } from '../permissions.js';
import { auditErrors } from '../errors.js';

const definition = {
  route: { method: 'DELETE', path: '/audit/sessions/{handle}', summary: '强制下线指定会话' },
  meta: { perm: AUDIT_PERMS.sessionRevoke },
} satisfies SliceDefinition;

const inputSchema = z.object({ handle: z.uuid() }).strict();
const outputSchema = z.object({ handle: z.uuid() }).strict();
const errors = { ...commonErrorContracts, ...kernelErrors, ...auditErrors };

export const revokeSession = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) =>
    runCommand(ctx, async (tx) => {
      const before = await getManagedSession(tx.db, tx.clock, input.handle, tx.sessionId);
      if (!before) throw new BizError('audit.session.not_found');
      if (before.current) throw new PermissionError({ reason: 'use_logout_for_current_session' });

      if (!tx.isSuperuser) {
        const target = z.uuid().safeParse(before.userId).success
          ? await getAuthUserById(tx.db, before.userId)
          : null;

        if (!target || target.isSystemAdmin)
          throw new PermissionError({ reason: 'system_admin_session' }, 'permission.escalation_denied');

        assertNoPrivilegeEscalation(
          { kind: 'set', codes: tx.permissions },
          await getPermCodesOfRoles(tx.db, await getRoleIdsOfUser(tx.db, target.id)),
        );
      }

      const after = await revokeManagedSession(tx.db, tx.clock, input.handle);
      if (!after) throw new BizError('audit.session.not_found');

      tx.audit.capture({
        objectType: 'session',
        objectId: input.handle,
        before: { handle: before.handle, revokedAt: null },
        after: { handle: after.handle, revokedAt: after.revokedAt?.toISOString() ?? null },
      });

      return outputSchema.parse({ handle: input.handle });
    }),
  );
