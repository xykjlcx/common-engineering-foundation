import type { RequestCtx, TxCtx } from './context.js';

/** 回调内的数据库操作共享事务；耗时准备应在调用前完成。 */
export async function runCommand<T>(ctx: RequestCtx, work: (context: TxCtx) => Promise<T>): Promise<T> {
  return ctx.db.transaction(async (tx) => {
    const txCtx: TxCtx = { ...ctx, db: tx };
    return work(txCtx);
  });
}
