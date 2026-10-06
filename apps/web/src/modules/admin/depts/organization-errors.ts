import { BizError } from '@/lib/http/errors';
export function organizationErrorKey(error: unknown, fallback = 'depts.saveFailed') {
  if (!(error instanceof BizError)) return fallback;
  if (['dept.impact_changed', 'dept.version_conflict', 'user.version_conflict'].includes(error.code))
    return 'depts.org.stale';
  if (['dept.invalid_hierarchy', 'dept.parent_cycle', 'dept.root_exists'].includes(error.code))
    return 'depts.org.hierarchyHint';
  if (error.code === 'dept.disabled') return 'depts.org.disabledBranch';
  if (error.code === 'dept.in_use') return 'depts.org.deleteBlocked';
  return fallback;
}
