import * as z from 'zod';
import type { DbExec } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { PG_REFERENCE_VIOLATION, PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { getDepartmentLeaderReferences } from '../user/api.js';

export const DeptWriteSchema = z.object({ id: z.uuid(), version: z.number().int() });

export function projectDeptWrite(value: { id: string; version: number }) {
  return DeptWriteSchema.parse(value);
}

export async function assertDepartmentLeader(db: DbExec, leaderId: string | null | undefined) {
  if (leaderId && !(await getDepartmentLeaderReferences(db, [leaderId])).length)
    throw new BizError('dept.leader_not_found');
}
const DEPT_CODE_UNIQUE_CONSTRAINT = 'dept_code_unique';
const DEPT_LEADER_FK_CONSTRAINT = 'dept_leader_id_app_user_id_fk';

export function rethrowDepartmentConstraint(error: unknown): never {
  if (violatedConstraint(error, PG_UNIQUE_VIOLATION) === DEPT_CODE_UNIQUE_CONSTRAINT)
    throw new BizError('dept.code_conflict');
  if (violatedConstraint(error, PG_REFERENCE_VIOLATION) === DEPT_LEADER_FK_CONSTRAINT)
    throw new BizError('dept.leader_not_found');
  throw error;
}

export function rethrowDepartmentDeleteConstraint(error: unknown, id: string): never {
  if (violatedConstraint(error, PG_REFERENCE_VIOLATION) !== null) throw new BizError('dept.in_use', { id });
  throw error;
}
