import type { z } from 'zod';
import type { rpc } from '@/lib/rpc/client';
import { OperationQuerySchema, LoginQuerySchema, SessionQuerySchema } from '@keel/core/audit-contract';

export {
  OperationQuerySchema,
  LoginQuerySchema,
  SessionQuerySchema,
  AuditRangeSchema,
} from '@keel/core/audit-contract';

export type OperationQuery = z.output<typeof OperationQuerySchema>;
export type LoginQuery = z.output<typeof LoginQuerySchema>;
export type OperationDto = Awaited<ReturnType<typeof rpc.audit.operations>>['list'][number];
export type OperationDetail = Awaited<ReturnType<typeof rpc.audit.operation>>;
export type LoginDto = Awaited<ReturnType<typeof rpc.audit.logins>>['list'][number];

export type SessionQuery = z.output<typeof SessionQuerySchema>;
export type OnlineSessionDto = Awaited<ReturnType<typeof rpc.audit.sessions>>['list'][number];
