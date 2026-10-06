import type { DeclaredCapability } from '../../../kernel/procedures.js';
import type { CatalogPermission } from './catalog-seed.js';
import { moduleKeyFromRouteId, resolveWiring, type WiringItem } from './permission-wiring.js';

export type { WiringDocument, WiringItem, WiringKind } from './permission-wiring.js';
export { moduleKeyFromRouteId, parseWiringDocument, resolveWiring } from './permission-wiring.js';

export type AdjudicationIssue = { kind: string; detail: string };

export function adjudicatePermissionCatalog(args: {
  permissions: readonly CatalogPermission[];
  capabilities: readonly DeclaredCapability[];
  wiring: readonly WiringItem[];
  routerKeys: readonly string[];
}): AdjudicationIssue[] {
  const issues: AdjudicationIssue[] = [];
  const routers = new Set(args.routerKeys);
  for (const item of args.wiring) {
    if (item.kind !== 'live') continue;
    for (const router of item.routers) {
      if (!routers.has(router)) issues.push({ kind: 'unknown-router', detail: `${item.key} → ${router}` });
    }
  }
  const byRouter = new Map<string, DeclaredCapability[]>();
  for (const capability of args.capabilities) {
    const list = byRouter.get(capability.router) ?? [];
    list.push(capability);
    byRouter.set(capability.router, list);
  }
  for (const permission of args.permissions) {
    const moduleKey = moduleKeyFromRouteId(permission.routeId);
    if (!moduleKey) {
      issues.push({ kind: 'unmapped-route', detail: permission.sourceKey });
      continue;
    }
    let wiring: WiringItem;
    try {
      wiring = resolveWiring(moduleKey, args.wiring);
    } catch (error) {
      issues.push({
        kind: 'unregistered-module',
        detail: error instanceof Error ? error.message : permission.sourceKey,
      });
      continue;
    }
    if (wiring.kind === 'demo') continue;
    const mapped = wiring.routers.flatMap((router) => byRouter.get(router) ?? []);
    const matches = mapped.filter((item) => item.perm === permission.code);
    if (matches.length === 0) {
      issues.push({ kind: 'frontend-unmatched', detail: `${permission.sourceKey} (${permission.code})` });
      continue;
    }
    const flags = new Set(matches.map((item) => item.superuserOnly));
    if (flags.size !== 1) {
      issues.push({ kind: 'superuserOnly-conflict', detail: permission.code });
      continue;
    }
    const backendOnly = flags.has(true);
    const frontendOnly = permission.superuserOnly === true;
    if (backendOnly !== frontendOnly) {
      issues.push({
        kind: 'superuserOnly-mismatch',
        detail: `${permission.sourceKey} frontend=${String(frontendOnly)} backend=${String(backendOnly)}`,
      });
    }
  }
  return issues;
}

export function formatAdjudicationFailure(issues: readonly AdjudicationIssue[]): string {
  return issues.map((issue) => `${issue.kind}: ${issue.detail}`).join('\n');
}
