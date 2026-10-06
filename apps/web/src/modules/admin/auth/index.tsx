import { isDemoBuild } from '@/config/env';
import { ChangePasswordScene } from './form/ChangePasswordScene';
import { ForgotPasswordScene, PasswordRecoveryScene } from './form/ForgotPasswordScene';
import { RegisterScene } from './form/RegisterScene';
import { LoginScene } from './list/LoginScene';
export function LoginPage(props: React.ComponentProps<typeof LoginScene>) {
  return <LoginScene {...props} />;
}
export function RegisterPage({ onGoLogin }: { onGoLogin: () => void }) {
  return isDemoBuild ? <RegisterScene onGoLogin={onGoLogin} /> : null;
}
export function ForgotPasswordPage({ onGoLogin }: { onGoLogin: () => void }) {
  return isDemoBuild ? (
    <ForgotPasswordScene onGoLogin={onGoLogin} />
  ) : (
    <PasswordRecoveryScene onGoLogin={onGoLogin} />
  );
}

export function ChangePasswordPage(props: React.ComponentProps<typeof ChangePasswordScene>) {
  return <ChangePasswordScene {...props} />;
}
