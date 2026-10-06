import { PublicSystemText } from '@/modules/admin/settings';
import {
  Eye,
  EyeOff,
  Globe2,
  Lock,
  UserRound,
  SlidersHorizontal,
  MessageSquare,
  Moon,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupSuffix,
} from '@/components/ui/input';
import { authApi, type LoginInput } from '../api';
import { resetSession } from '@/lib/reset-auth';
import { useInterrupt } from '@/stores/interrupt';
import { BizError, HttpError } from '@/lib/http/errors';
import { cn } from '@/lib/utils';
import { appConfig, isDemoBuild } from '@/config';
import { useAppearance } from '@/stores/appearance';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';

// 同源校验：只接受站内绝对路径，挡掉 //evil.com、/\evil.com、http(s):// 等开放重定向注入
function safeInternalPath(to: string | undefined): string {
  if (to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/\\')) return to;
  return appConfig.routes.home;
}

type AuthTab = 'password' | 'sms' | 'qr';

const authTabs = [
  { key: 'password', icon: Lock },
  { key: 'sms', icon: Smartphone },
  { key: 'qr', icon: QrCode },
] as const;

export function LoginScene({
  redirect,
  onAuthenticated,
  onGoForgotPassword,
  onGoRegister,
}: {
  redirect?: string;
  onAuthenticated: (redirect: string) => Promise<void>;
  onGoForgotPassword: () => void;
  onGoRegister: () => void;
}) {
  const { t, i18n } = useTranslation();
  const mode = useAppearance((s) => s.mode);
  const setAppearance = useAppearance((s) => s.set);
  const toggleLang = () => {
    const next = i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN';
    void i18n.changeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  const toggleTheme = () => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' });
  const [tab, setTab] = useState<AuthTab>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [sms, setSms] = useState({ phone: '', code: '' });
  // 表单值直接取 api schema 的推导类型（DTO 不在组件里手写第二份）；rememberMe 默认不勾
  const { register, control, handleSubmit, setError, clearErrors, formState } = useForm<LoginInput>({
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  // 会话过期后经通条「去登录」或导航期 401 到达此页：受保护树已卸载，此时清缓存不会触发重拉
  // （顺序纪律见 lib/reset-auth.ts）；通条状态一并撤掉，避免登录成功后又弹一次。
  // Cookie 会话下前端不持令牌，resetSession 只做「清上个会话的缓存 + 复位过期闩」。
  useEffect(() => {
    if (useInterrupt.getState().kind !== 'sessionExpired') return;
    useInterrupt.getState().dismiss();
    void resetSession();
  }, []);

  const showAuthenticationError = (error: unknown) => {
    if ((error instanceof HttpError || error instanceof BizError) && error.status === 401) {
      const trace =
        error instanceof BizError && error.traceId ? ` · ${t('auth.traceId')}: ${error.traceId}` : '';
      setError('root', { message: `${t('auth.invalidCredentials')}${trace}` });
    } else {
      setError('root', { message: error instanceof Error ? error.message : t('auth.invalidCredentials') });
    }
  };

  // 未接通的企业 SSO、短信、扫码仅在 demo 展示，通过提示条说明能力状态。
  const onStubEntry = () => setError('root', { message: t('auth.stubEntry') });

  const onSubmit = handleSubmit(async (dto) => {
    if (tab !== 'password') {
      onStubEntry();
      return;
    }
    try {
      // 登录成功 = 后端下发 HttpOnly 会话 Cookie；前端不接触令牌，只需清掉上个账号的缓存
      await authApi.login(dto);
      await resetSession();
      await onAuthenticated(safeInternalPath(redirect));
    } catch (e) {
      showAuthenticationError(e);
    }
  });

  return (
    <main className="ui-login">
      <section className="ui-login-card">
        <header className="ui-login-brand">
          <span className="ui-login-mark">
            <SlidersHorizontal aria-hidden="true" />
          </span>
          <span>
            <PublicSystemText field="appName" fallback="Keel" />
          </span>
        </header>

        <form onSubmit={(event) => void onSubmit(event)} className="ui-login-form">
          <h1 className="ui-page-title ui-login-title">{t('auth.login')}</h1>
          <p className="ui-login-description">
            <PublicSystemText field="loginDescription" fallback={t('auth.loginDesign.description')} />
          </p>

          {isDemoBuild && (
            <div className="ui-soft-track mt-7 grid grid-cols-3 gap-1 rounded-10 p-1">
              {authTabs.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={tab === item.key ? 'secondary' : 'text'}
                    size="sm"
                    className={cn(
                      'h-[calc(36px*var(--app-scale))] gap-1.5 rounded-8 text-[calc(13px*var(--app-scale))]',
                      tab === item.key ? 'font-semibold' : 'text-(--type-2-fg)',
                    )}
                    onClick={() => {
                      clearErrors('root');
                      setTab(item.key);
                    }}
                  >
                    <Icon data-icon="inline-start" />
                    {t(`auth.tabs.${item.key}`)}
                  </Button>
                );
              })}
            </div>
          )}

          {tab === 'qr' ? (
            <QrPanel onConfirm={onStubEntry} />
          ) : tab === 'password' ? (
            <PasswordFields
              register={register}
              control={control}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
              onForgotPassword={onGoForgotPassword}
            />
          ) : (
            <SmsFields
              value={sms}
              onChange={(next) => setSms((current) => ({ ...current, ...next }))}
              onSend={onStubEntry}
            />
          )}

          {formState.errors.root && (
            <p role="alert" className="ui-login-error">
              {formState.errors.root.message}
            </p>
          )}

          {tab !== 'qr' && (
            <>
              <Button
                type="submit"
                size="lg"
                block
                disabled={tab === 'sms' && (sms.phone.length !== 11 || sms.code.length !== 6)}
                loading={formState.isSubmitting}
                className="ui-login-submit"
              >
                {t('auth.login')}
              </Button>

              {isDemoBuild && (
                <>
                  <div className="my-6 flex items-center gap-3.5">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[calc(12px*var(--app-scale))] text-text-3">
                      {t('auth.enterpriseLogin')}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {['SSO', 'Google', 'WeCom'].map((item) => (
                      <Button
                        key={item}
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-[calc(44px*var(--app-scale))] gap-2 rounded-10 text-[calc(13px*var(--app-scale))]"
                        onClick={onStubEntry}
                      >
                        {item === 'WeCom' ? (
                          <MessageSquare className="size-4 text-success" />
                        ) : item === 'SSO' ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <span className="font-bold text-(--accent-emphasis)">G</span>
                        )}
                        {item}
                      </Button>
                    ))}
                  </div>

                  <p className="mt-[calc(22px*var(--app-scale))] text-center text-[calc(13px*var(--app-scale))] text-text-3">
                    {t('auth.noAccount')}{' '}
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      className="font-medium"
                      onClick={onGoRegister}
                    >
                      {t('auth.register')}
                    </Button>
                  </p>
                </>
              )}
            </>
          )}
        </form>
        <footer className="ui-login-footer">
          <Button type="button" variant="ghost" size="xs" onClick={toggleLang}>
            <Globe2 data-icon="inline-start" />
            {i18n.language.startsWith('zh') ? '中文 / EN' : 'EN / 中文'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('auth.switchTheme')}
            onClick={toggleTheme}
          >
            {mode === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={onGoForgotPassword}>
            {t('auth.loginDesign.help')}
          </Button>
        </footer>
      </section>
      <HeroPanel />
    </main>
  );
}

function HeroPanel() {
  const { t } = useTranslation();
  return (
    <aside className="ui-login-hero">
      <svg
        className="ui-login-hull"
        viewBox="0 0 800 880"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g className="ui-login-grid">
          <path d="M0 120H800M0 200H800M0 280H800M0 360H800M0 440H800M0 520H800M0 600H800" />
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M80 200V380A320 288 0 0 0 720 380V200" strokeOpacity=".14" />
          <path d="M120 200V380A280 252 0 0 0 680 380V200" strokeOpacity=".24" />
          <path d="M160 200V380A240 216 0 0 0 640 380V200" strokeOpacity=".34" />
          <path d="M200 200V380A200 180 0 0 0 600 380V200" strokeOpacity=".44" />
          <path d="M240 200V380A160 144 0 0 0 560 380V200" strokeOpacity=".54" />
          <path d="M280 200V380A120 108 0 0 0 520 380V200" strokeOpacity=".64" />
          <path d="M320 200V380A80 72 0 0 0 480 380V200" strokeOpacity=".74" />
        </g>
        <g className="ui-login-keel">
          <path d="M400 130V740" strokeWidth="3" strokeLinecap="round" />
          <circle cx="400" cy="740" r="6" />
          <circle className="ui-login-keel-ring" cx="400" cy="200" r="4" strokeWidth="2" />
          <path d="M80 740H320M480 740H720" strokeOpacity=".55" strokeDasharray="3 5" />
        </g>
        <text className="ui-login-baseline" x="80" y="180" fontSize="11">
          KEEL · BASELINE
        </text>
      </svg>
      <div className="ui-login-hero-copy">
        <h2>
          {t('auth.loginDesign.headline1')}
          <br />
          {t('auth.loginDesign.headline2')}
        </h2>
        <p>{t('auth.loginDesign.heroDescription')}</p>
      </div>
    </aside>
  );
}

function PasswordFields({
  register,
  control,
  showPassword,
  onTogglePassword,
  onForgotPassword,
}: {
  register: ReturnType<typeof useForm<LoginInput>>['register'];
  control: ReturnType<typeof useForm<LoginInput>>['control'];
  showPassword: boolean;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
}) {
  const { t } = useTranslation();
  const passwordToggleLabel = showPassword ? t('auth.hidePassword') : t('auth.showPassword');
  return (
    <>
      <div className="ui-login-account">
        <label htmlFor="login-username" className="ui-login-label">
          {t('auth.account')}
        </label>
        <InputGroup inputSize="lg" className="ui-login-input">
          <InputGroupPrefix>
            <UserRound data-icon="inline-start" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-username"
            {...register('username')}
            autoComplete="username"
            placeholder={t('auth.loginDesign.accountPlaceholder')}
            required
          />
        </InputGroup>
      </div>
      {/* 忘记密码在 DOM 上排在密码输入之后，Tab 才会从账号直达密码；视觉位置靠绝对定位留在标签行右侧。 */}
      <div className="ui-login-password">
        <div className="ui-login-password-label">
          <label htmlFor="login-password" className="ui-login-label">
            {t('auth.password')}
          </label>
        </div>
        <InputGroup inputSize="lg" className="ui-login-input">
          <InputGroupPrefix>
            <Lock data-icon="inline-start" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-password"
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('auth.loginDesign.passwordPlaceholder')}
            required
          />
          <InputGroupSuffix>
            <Button
              type="button"
              aria-label={passwordToggleLabel}
              title={passwordToggleLabel}
              onClick={onTogglePassword}
              variant="ghost"
              size="icon-xs"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </InputGroupSuffix>
        </InputGroup>
        <Button type="button" variant="link" size="xs" className="ui-login-forgot" onClick={onForgotPassword}>
          {t('auth.forgotPassword')}
        </Button>
      </div>
      {/* 记住我排在密码块之后，Tab 顺序仍是 账号 → 密码 → 显示密码 → 忘记密码 → 记住我。
          勾选后端按当前策略下发持久 Cookie，不勾则是关浏览器即失效的会话级 Cookie。 */}
      <label className="ui-login-remember">
        <Controller
          control={control}
          name="rememberMe"
          render={({ field }) => (
            <Checkbox
              name={field.name}
              aria-label={t('auth.remember')}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <span>{t('auth.remember')}</span>
      </label>
    </>
  );
}

function SmsFields({
  value,
  onChange,
  onSend,
}: {
  value: { phone: string; code: string };
  onChange: (next: Partial<{ phone: string; code: string }>) => void;
  onSend: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-[calc(26px*var(--app-scale))] grid gap-[calc(18px*var(--app-scale))]">
      <div>
        <label
          htmlFor="login-phone"
          className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-(--type-2-fg)"
        >
          {t('auth.phone')}
        </label>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix className="items-center gap-2 text-(--type-2-fg)">
            <span className="text-sm">+86</span>
            <span className="h-[calc(18px*var(--app-scale))] w-px bg-border" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-phone"
            value={value.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder={t('auth.phonePlaceholder')}
            className="text-sm text-text"
          />
        </InputGroup>
      </div>
      <div>
        <label
          htmlFor="login-sms-code"
          className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-(--type-2-fg)"
        >
          {t('auth.smsCode')}
        </label>
        <div className="flex gap-2.5">
          <Input
            id="login-sms-code"
            value={value.code}
            onChange={(event) => onChange({ code: event.target.value })}
            inputSize="lg"
            placeholder={t('auth.smsPlaceholder')}
            className="h-[calc(46px*var(--app-scale))] rounded-10 px-3.5 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-[calc(46px*var(--app-scale))] w-[calc(120px*var(--app-scale))] rounded-10 border-(--accent-emphasis) text-[calc(13px*var(--app-scale))] text-(--accent-emphasis) hover:border-(--accent-emphasis) hover:text-(--accent-emphasis)"
            disabled={value.phone.length !== 11}
            onClick={onSend}
          >
            {t('auth.getSmsCode')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QrPanel({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center gap-3.5">
      <div className="flex size-[calc(180px*var(--app-scale))] items-center justify-center rounded-14 border border-border bg-surface">
        <QrCode className="size-[calc(120px*var(--app-scale))] text-text-3" strokeWidth={1.2} />
      </div>
      <div className="text-[calc(13px*var(--app-scale))] text-text-3">{t('auth.qrHint')}</div>
      <Button type="button" variant="outline" onClick={onConfirm}>
        {t('auth.qrMockConfirm')}
      </Button>
    </div>
  );
}
