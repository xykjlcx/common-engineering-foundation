import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { AUDIT_PERMS } from '../permissions.js';
import * as z from 'zod';
import { PermissionError } from '../../../kernel/errors.js';
import { AuditEntrySchema } from '../contract.js';

const definition = {
  route: { method: 'GET', path: '/audit/entry', summary: '审计可见页签' },
  meta: { perm: AUDIT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({});
const outputSchema = AuditEntrySchema;
const errors = commonErrorContracts;

export const queryEntry = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(({ context: ctx }) => {
    const tabs: ('oplog' | 'login' | 'sessions')[] =
      ctx.isSuperuser || ctx.permissions.has(AUDIT_PERMS.logView) ? ['oplog', 'login'] : [];

    if (ctx.isSuperuser || ctx.permissions.has(AUDIT_PERMS.sessionView)) tabs.push('sessions');
    if (!tabs.length) throw new PermissionError({ reason: 'no_audit_tab' });

    return { tabs };
  });
