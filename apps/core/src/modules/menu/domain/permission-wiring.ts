export type WiringKind = 'live' | 'demo';

export type WiringItem =
  { key: string; kind: 'live'; routers: readonly string[] } | { key: string; kind: 'demo' };

export type WiringDocument = { version: 1; items: readonly WiringItem[] };

const liveKeys = ['key', 'kind', 'routers'] as const;
const demoKeys = ['key', 'kind'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseWiringDocument(input: unknown): WiringDocument {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.items)) {
    throw new Error('wiring.json root schema 非法');
  }
  const items: WiringItem[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw) || typeof raw.key !== 'string' || raw.key.length === 0) {
      throw new Error('wiring.json item schema 非法');
    }
    if (seen.has(raw.key)) throw new Error(`wiring 重复登记: ${raw.key}`);
    seen.add(raw.key);
    if (raw.kind === 'live') {
      const keys = Object.keys(raw).sort().join(',');
      if (
        keys !== [...liveKeys].sort().join(',') ||
        !Array.isArray(raw.routers) ||
        raw.routers.length === 0
      ) {
        throw new Error(`wiring live 项非法: ${raw.key}`);
      }
      const routers: string[] = [];
      for (const router of raw.routers) {
        if (typeof router !== 'string' || router.length === 0)
          throw new Error(`wiring routers 非法: ${raw.key}`);
        routers.push(router);
      }
      items.push({ key: raw.key, kind: 'live', routers });
      continue;
    }
    if (raw.kind === 'demo') {
      const keys = Object.keys(raw).sort().join(',');
      if (keys !== [...demoKeys].sort().join(',')) throw new Error(`wiring demo 项非法: ${raw.key}`);
      items.push({ key: raw.key, kind: 'demo' });
      continue;
    }
    throw new Error(`wiring kind 非法: ${raw.key}`);
  }
  return { version: 1, items };
}

export function moduleKeyFromRouteId(routeId: string): string | null {
  const match = /^\/_auth\/([^/]+)\/([^/]+)/.exec(routeId);
  if (!match?.[1] || !match[2]) return null;
  return `${match[1]}/${match[2]}`;
}

export function resolveWiring(moduleKey: string, items: readonly WiringItem[]): WiringItem {
  const exact = items.find((item) => item.key === moduleKey);
  const subsystem = moduleKey.split('/')[0];
  const grouped = subsystem ? items.find((item) => item.key === subsystem) : undefined;
  if (exact && grouped) throw new Error(`wiring 重叠登记: ${moduleKey}`);
  if (exact) return exact;
  if (grouped) return grouped;
  throw new Error(`未登记模块: ${moduleKey}`);
}
