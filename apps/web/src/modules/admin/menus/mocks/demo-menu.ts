import type { rpc } from '@/lib/rpc/client';
import { BizError } from '@/lib/http/errors';

type Created = Awaited<ReturnType<typeof rpc.menu.create>>;
type Updated = Awaited<ReturnType<typeof rpc.menu.update>>;
type DemoNode = Created & Updated & { children: DemoNode[] };

let nodes: DemoNode[] | undefined;
const rows = () => (nodes ??= []);
const fail = (code: string, status = 409): never => {
  throw new BizError({ code, status, instance: null, traceId: null, retryAfter: null });
};

function flatten(list: DemoNode[]): DemoNode[] {
  return list.flatMap((node) => [node, ...flatten(node.children)]);
}

export const demoMenu: Pick<typeof rpc.menu, 'navigation' | 'tree' | 'create' | 'update' | 'delete'> = {
  navigation: () => Promise.resolve(flatten(rows()).map(({ children: _children, ...row }) => row)),
  tree: () => Promise.resolve({ nodes: rows() }),
  create: (input) => {
    const stamp = new Date().toISOString();
    const node: DemoNode = {
      id: crypto.randomUUID(),
      parentId: input.parentId ?? null,
      subsystemKey: input.subsystemKey ?? 'admin',
      type: 'dir',
      catalogIdentity: null,
      origin: 'runtime',
      runtimeManaged: true,
      label: input.label,
      icon: input.icon ?? null,
      path: null,
      permCode: null,
      visible: input.visible ?? true,
      sort: input.sort ?? 0,
      version: 0,
      createdAt: stamp,
      updatedAt: stamp,
      children: [],
    };
    rows().push(node);
    return Promise.resolve(node);
  },
  update: async ({ id, version, ...patch }) => {
    const node = flatten(rows()).find((item) => item.id === id);
    if (!node) return fail('menu.not_found', 404);
    if (node.version !== version) return fail('menu.version_conflict');
    Object.assign(node, patch, { version: version + 1, updatedAt: new Date().toISOString() });
    return node;
  },
  delete: async ({ id, version }) => {
    const node = flatten(rows()).find((item) => item.id === id);
    if (!node) return fail('menu.not_found', 404);
    if (node.version !== version) return fail('menu.version_conflict');
    nodes = rows().filter((item) => item.id !== id);
    return { id };
  },
};
