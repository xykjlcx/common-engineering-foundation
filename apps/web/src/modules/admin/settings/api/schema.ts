import type { rpc } from '@/lib/rpc/client';
export { SettingsValuesSchema, SettingsViewSchema, passwordMeetsPolicy } from '@keel/core/settings-contract';
export type { SettingsValues, CredentialSettings } from '@keel/core/settings-contract';
export type SettingsDto = Awaited<ReturnType<typeof rpc.settings.query>>;
