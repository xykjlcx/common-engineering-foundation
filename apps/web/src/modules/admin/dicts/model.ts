import { z } from 'zod';
import type { TFunction } from 'i18next';
import { BizError } from '@/lib/http/errors';

export const dictSearchSchema = z.object({
  type: z.string().optional(),
  keyword: z.string().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(15),
});

export function dictError(error: unknown, t: TFunction<'admin'>): string {
  if (error instanceof BizError) {
    switch (error.code) {
      case 'dict.code_conflict':
        return t('dicts.errors.codeConflict');
      case 'dict.value_conflict':
        return t('dicts.errors.valueConflict');
      case 'dict.version_conflict':
        return t('dicts.errors.versionConflict');
      case 'dict.type_not_empty':
        return t('dicts.errors.typeNotEmpty');
      case 'dict.builtin_protected':
        return t('dicts.errors.builtin');
    }
  }

  return t('dicts.errors.failed');
}
