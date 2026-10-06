import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isDemoBuild } from '@/config';
import { FieldDescription } from '@/components/ui/field';
import { settingsConstraintsQuery } from '../api';
export function PasswordPolicyHint() {
  const { t } = useTranslation('admin');
  const { data } = useQuery({ ...settingsConstraintsQuery, enabled: !isDemoBuild });
  if (!data) return null;
  const policy = data.credentials;
  const requirements = [
    policy.requireUppercase && t('settings.passwordUpper'),
    policy.requireLowercase && t('settings.passwordLower'),
    policy.requireNumber && t('settings.passwordNumber'),
    policy.requireSymbol && t('settings.passwordSymbol'),
  ]
    .filter(Boolean)
    .join(t('settings.passwordJoin'));
  return (
    <FieldDescription>
      {t('settings.passwordRequirements', {
        length: policy.minLength,
        requirements: requirements ? `${t('settings.passwordPrefix')}${requirements}` : '',
      })}
    </FieldDescription>
  );
}
