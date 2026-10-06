import { queryActors } from './slices/query-actors.js';
import { queryEntry } from './slices/query-entry.js';
import { queryOperations } from './slices/query-operations.js';
import { queryOperation } from './slices/query-operation.js';
import { queryLogins } from './slices/query-logins.js';
import { querySessions } from './slices/query-sessions.js';
import { revokeSession } from './slices/revoke-session.js';

export const auditRouter = {
  entry: queryEntry,
  actors: queryActors,
  operations: queryOperations,
  operation: queryOperation,
  logins: queryLogins,
  sessions: querySessions,
  revokeSession,
};
