import { z } from 'zod';
import type { TFunction } from 'i18next';
import { BizError } from '@/lib/http/errors';
import { PostFilterRootSchema } from '@keel/core/post-contract';
import type { FilterFieldDef, FilterOperator, FilterRoot } from '@/components/pro/filter-builder/types';

export const emptyFilters: FilterRoot = { op: 'and', items: [] };

export function parseFilters(raw: string | undefined | null): FilterRoot {
  if (!raw) return emptyFilters;

  try {
    const result = PostFilterRootSchema.safeParse(JSON.parse(raw) as unknown);
    return result.success ? result.data : emptyFilters;
  } catch {
    return emptyFilters;
  }
}

export function stringifyFilters(root: FilterRoot) {
  return root.items.length > 0 ? JSON.stringify(root) : '';
}

export function postFilterFields(t: (key: string) => string): FilterFieldDef[] {
  return [
    {
      key: 'enabled',
      label: t('fields.enabled'),
      input: 'select',
      operators: ['eq'],
      quick: true,
      options: [
        { value: 'true', label: t('status.enabled') },
        { value: 'false', label: t('status.disabled') },
      ],
    },
  ];
}

export const postOperatorLabels = (t: (key: string) => string): Partial<Record<FilterOperator, string>> => ({
  eq: t('operators.eq'),
});

export const postsSearchSchema = z.object({
  keyword: z.string().catch(''),
  filters: z.string().optional(),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(15),
});

export function postError(error: unknown, t: TFunction<'admin'>) {
  if (error instanceof BizError) {
    switch (error.code) {
      case 'post.in_use':
        return t('posts.errors.inUse', {
          count: typeof error.params.count === 'number' ? error.params.count : 0,
        });
      case 'post.code_conflict':
        return t('posts.errors.codeConflict');
      case 'post.name_conflict':
        return t('posts.errors.nameConflict');
      case 'post.version_conflict':
        return t('posts.errors.versionConflict');
      case 'post.role_unavailable':
        return t('posts.errors.roleUnavailable');
      case 'permission.escalation_denied':
        return t('posts.errors.escalation');
    }
  }

  return t('posts.form.saveFailed');
}
