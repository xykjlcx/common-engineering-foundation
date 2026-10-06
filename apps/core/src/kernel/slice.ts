import type { authedProc, ProcMeta } from './procedures.js';

export interface SliceDefinition {
  route: Parameters<typeof authedProc.route>[0];
  meta: ProcMeta;
}
