import { BizError } from '@/lib/http/errors';
import type { SettingsValues } from './api';
export const settingsSections = ['general', 'security', 'credentials', 'uploads'] as const;
export type SettingsSection = (typeof settingsSections)[number];
export function changedSettingsCount(values: SettingsValues, baseline: SettingsValues): number {
  return settingsSections.reduce(
    (count, section) =>
      count +
      Object.entries(values[section]).filter(
        ([field, value]) => Reflect.get(baseline[section], field) !== value,
      ).length,
    0,
  );
}
export function settingsError(error: unknown, t: (key: string) => string): string {
  if (error instanceof BizError && error.status === 409) return t('settings.errors.conflict');
  if (error instanceof BizError && error.status === 403) return t('settings.errors.forbidden');
  return t('settings.errors.save');
}
