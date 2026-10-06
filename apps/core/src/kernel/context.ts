import type { AuditSink } from './audit.js';
import type { Clock } from './clock.js';
import type { Db } from './db.js';
import type { Logger } from './logger.js';
import type { CookieJar } from './middleware.js';
import type { RuntimePolicy } from './policy.js';

export type { Db } from './db.js';
type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];
export type TxExec = Omit<Transaction, 'transaction'>;
export type DbExec = Omit<Db, 'transaction'>;

/** 墙二数据范围：all（全量）/ own（名下）。具体"名下"语义由各模块可见性构造器定义 */
export type DataScope =
  'all' | 'own' | { kind: 'scoped'; ids: readonly string[]; unitIds: readonly string[] };

export interface Ctx {
  db: DbExec;
  clock: Clock;

  logger: Logger;
  idgen: () => string;
  /** 与 HTTP 层共享 Cookie jar，仅用于会话生命周期写回。 */
  cookies: CookieJar;
  userId: string;
  scope: DataScope;
  /** 身份资格与可见数据范围独立；仅主体装配可赋值。 */
  isSuperuser: boolean;

  principal: string;

  permissions: ReadonlySet<string>;
  /** 装配根 router 声明的实际能力；与角色授权独立，超管也不能创造未实现能力。 */
  availablePermissions: ReadonlySet<string>;
  sessionId: string | null;
  isImpersonation: boolean;
  ip: string | null;
  audit: AuditSink;
}

export type RequestCtx = Ctx & { db: Db };
export type TxCtx = Ctx & { db: TxExec };

/** 无会话主体；Cookie 与来源信息供认证操作使用。 */
export interface PublicCtx {
  db: Db;
  clock: Clock;
  logger: Logger;
  idgen: () => string;
  cookies: CookieJar;
  ip: string | null;
  ua: string | null;
  /** 运行期可调策略（失败锁定与会话时长）；由装配层从 env 注入。 */
  policy: RuntimePolicy;
}
