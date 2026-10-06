import { PasswordPolicyHint } from '@/modules/admin/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Circle, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CardDescription } from '@/components/ui/card';
import { TableText } from '@/components/pro/TableText';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthExpiredError, BizError } from '@/lib/http/errors';
import { resetSession } from '@/lib/reset-auth';
import { useInterrupt } from '@/stores/interrupt';
import { authApi, ChangePasswordFormSchema, meQuery, type ChangePasswordFormInput } from '../api';
import { AuthPageLayout } from '../components/AuthPageLayout';

const passwordFields = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

export function ChangePasswordScene({ onGoLogin }: { onGoLogin: () => Promise<void> }) {
  const { t } = useTranslation();
  const [working, setWorking] = useState(false);
  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [leaving, setLeaving] = useState(false);
  const requestLock = useRef(false);
  const navigationStarted = useRef(false);
  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const currentPassword = useWatch({ control: form.control, name: 'currentPassword' });
  const newPassword = useWatch({ control: form.control, name: 'newPassword' });
  const passwordChanged = !!newPassword && !!currentPassword && newPassword !== currentPassword;
  // 专页始终重新验证 Cookie，会话缓存不能替代这次确认；不加载 Shell 及其业务查询。
  const session = useQuery({ ...meQuery, staleTime: 0, enabled: !leaving });
  const leave = useCallback(async () => {
    if (navigationStarted.current) return;
    navigationStarted.current = true;
    setLeaving(true);
    await onGoLogin();
    useInterrupt.getState().dismiss();
    await resetSession();
  }, [onGoLogin]);
  useEffect(() => {
    if (session.error instanceof AuthExpiredError) void leave();
  }, [leave, session.error]);

  const errorMessage = (reason: unknown) => {
    if (reason instanceof BizError) {
      if (reason.code === 'auth.current_password_invalid') return t('auth.changePassword.currentInvalid');
      if (reason.code === 'auth.password_unchanged') return t('auth.changePassword.unchanged');
      if (reason.code === 'validation.failed') return t('auth.changePassword.requirements');
    }
    return t('auth.changePassword.failed');
  };
  const submit = async ({ currentPassword, newPassword }: ChangePasswordFormInput) => {
    if (requestLock.current || leaving) return;
    requestLock.current = true;
    setWorking(true);
    form.clearErrors('root');
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      form.reset();
      await leave();
      toast.success(t('auth.changePassword.success'));
    } catch (reason) {
      if (reason instanceof AuthExpiredError) await leave();
      else form.setError('root', { message: errorMessage(reason) });
    } finally {
      requestLock.current = false;
      setWorking(false);
    }
  };
  const logout = async () => {
    if (requestLock.current || leaving) return;
    requestLock.current = true;
    setWorking(true);
    form.clearErrors('root');
    try {
      await authApi.logout();
      await leave();
    } catch (reason) {
      if (reason instanceof AuthExpiredError) await leave();
      else form.setError('root', { message: errorMessage(reason) });
    } finally {
      requestLock.current = false;
      setWorking(false);
    }
  };

  return (
    <AuthPageLayout compact>
      <div className="grid gap-4">
        <QueryState
          data={!leaving && session.isFetchedAfterMount && !session.isError ? session.data : undefined}
          pending={session.isPending || leaving}
          refreshing={session.isFetching && !session.isPending}
          error={session.isError && !(session.error instanceof AuthExpiredError)}
          loadingLabel={t('auth.changePassword.loading')}
          errorLabel={t('auth.changePassword.loadFailed')}
          retryLabel={t('errors.retry')}
          onRetry={() => void session.refetch()}
        >
          {(me) => (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (!requestLock.current) void form.handleSubmit(submit)(event);
              }}
            >
              <FieldSet disabled={working || leaving} className="gap-5">
                <div className="grid gap-3">
                  <LockKeyhole className="size-7" aria-hidden="true" />
                  <h1 className="text-xl font-semibold">
                    {t(
                      me.mustChangePassword ? 'auth.changePassword.firstTitle' : 'auth.changePassword.title',
                    )}
                  </h1>
                  <CardDescription>
                    {me.mustChangePassword
                      ? t('auth.changePassword.firstDescription', { name: me.name })
                      : t('auth.changePassword.description')}
                  </CardDescription>
                </div>
                {passwordFields.map((name) => {
                  const id = `change-password-${name}`;
                  const error = form.formState.errors[name];
                  return (
                    <Field key={name} data-invalid={!!error}>
                      <FieldLabel htmlFor={id}>{t(`auth.changePassword.${name}`)}</FieldLabel>
                      <Input
                        id={id}
                        type={visible[name] ? 'text' : 'password'}
                        inputSize="lg"
                        placeholder={t(`auth.changePassword.${name}Placeholder`)}
                        suffix={
                          <Button
                            type="button"
                            variant="text"
                            size="icon-sm"
                            aria-label={t(
                              visible[name]
                                ? 'auth.changePassword.hideField'
                                : 'auth.changePassword.showField',
                              { field: t(`auth.changePassword.${name}`) },
                            )}
                            aria-pressed={visible[name]}
                            onClick={() => setVisible((value) => ({ ...value, [name]: !value[name] }))}
                          >
                            {visible[name] ? <EyeOff /> : <Eye />}
                          </Button>
                        }
                        autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                        {...form.register(name)}
                        aria-invalid={!!error}
                        aria-describedby={
                          error ? `${id}-error` : name === 'newPassword' ? 'password-rules' : undefined
                        }
                      />
                      {name === 'currentPassword' && me.mustChangePassword && (
                        <FieldDescription>{t('auth.changePassword.initialHint')}</FieldDescription>
                      )}
                      {name === 'newPassword' && (
                        <div id="password-rules" className="grid gap-1.5">
                          <PasswordPolicyHint />
                          <TableText
                            tone={passwordChanged ? 'success' : 'hint'}
                            className="flex items-center gap-2"
                          >
                            {passwordChanged ? (
                              <Check className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Circle className="size-3.5" aria-hidden="true" />
                            )}
                            {t('auth.changePassword.differentRule')}
                          </TableText>
                        </div>
                      )}
                      <FieldError id={`${id}-error`}>
                        {error
                          ? t(
                              name === 'confirmPassword'
                                ? 'auth.changePassword.mismatch'
                                : 'auth.changePassword.requirements',
                            )
                          : null}
                      </FieldError>
                    </Field>
                  );
                })}
                <Alert variant="info" role="note">
                  <ShieldCheck aria-hidden="true" />
                  <AlertDescription>{t('auth.changePassword.sessionNotice')}</AlertDescription>
                </Alert>
                <FieldError role="alert">{form.formState.errors.root?.message}</FieldError>
                <Button type="submit" block size="lg" loading={working} disabled={leaving}>
                  {t('auth.changePassword.submit')}
                </Button>
              </FieldSet>
            </form>
          )}
        </QueryState>
        <Button type="button" variant="text" disabled={working || leaving} onClick={() => void logout()}>
          {t('auth.changePassword.logout')}
        </Button>
      </div>
    </AuthPageLayout>
  );
}
