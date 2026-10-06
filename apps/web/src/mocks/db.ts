// 关系型内存库；M0 建 menu/subsystem 域，M1 扩其余域（见 spec §5.3）。
// 各域一行 createCollection 即得完整 CRUD。
// 注意：**认证域不在这里**——会话（登录/回显/登出）已直连后端 /rpc 面，
// 前端 mock 不再持有用户口令、令牌与会话表（假协议随 Cookie 会话改造整体拆除）。

// ── 通用集合工厂（CRUD + reset；id 生成用独立的 genId，工厂本身不自动生成）──────────
// 每个域一行 createCollection(seed, key) 即得完整 CRUD，免手写 find/set 样板。
// 注意：all()/find() 返回内存活引用（可被直接 mutate），仅限 mock 内部使用。
const collections: { reset: () => void }[] = [];
let idSeq = 0;

export const genId = (prefix = 'id') => `${prefix}-${++idSeq}`;

export function createCollection<T extends object, K extends keyof T>(seed: readonly T[], keyField: K) {
  const clone = (): T[] => seed.map((s) => ({ ...s }));
  let items: T[] = clone();
  const col = {
    all: () => items,
    find: (key: T[K]) => items.find((i) => i[keyField] === key),
    filter: (pred: (i: T) => boolean) => items.filter(pred),
    insert: (item: T) => {
      items.push(item);
      return item;
    },
    update: (key: T[K], patch: Partial<T>) => {
      const i = items.find((x) => x[keyField] === key);
      if (i) Object.assign(i, patch);
      return i;
    },
    remove: (key: T[K]) => {
      const before = items.length;
      items = items.filter((x) => x[keyField] !== key);
      return items.length < before;
    },
    reset: () => {
      items = clone();
    },
  };
  collections.push(col);
  return col;
}

// 测试隔离用：重置所有集合 + 归零 id 序列
export function resetDb() {
  for (const c of collections) c.reset();
  idSeq = 0;
}
