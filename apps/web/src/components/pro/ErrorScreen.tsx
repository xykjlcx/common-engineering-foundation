import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';
import { cn } from '@/lib/utils';

export interface ErrorScreenProps {
  code: '403' | '404' | '500';
  title: string;
  description?: ReactNode;
  backHomeLabel: string;
  homeTo: string;
  // 运行时错误兜底用：传入则渲染「重试」主按钮（403/404 这类静态错误不传）
  retryLabel?: string;
  onRetry?: () => void;

  secondaryAction?: ReactNode;

  linkAction?: ReactNode;
  // 500/403 必须留可追溯凭据，否则运维无法定位（StateError.dc.html 三、一格脚注）
  traceId?: ReactNode;
}

// ErrorScreen 只承载错误页展示结构；文案与跳转目标由调用方注入，避免 pro 层绑定 i18n/config。
// 内部改用 pro/Result 渲染（DSAdditions 4.7 规格行：三个错误码是 Result 的子集，落地合并为一件），
// 本件只剩「整页高度 + 动作行装配 + traceId 脚注」三件外壳职责，
// 视觉取 DSAdditions 4.7 的 403 格：34px 等宽错误码 + 15px/600 标题 + 12px 说明 + 28px 动作行。
export function ErrorScreen({
  code,
  title,
  description,
  backHomeLabel,
  homeTo,
  retryLabel,
  onRetry,
  secondaryAction,
  linkAction,
  traceId,
}: ErrorScreenProps) {
  return (
    <div
      data-slot="error-screen"
      data-code={code}
      className="flex h-full min-h-[calc(400px*var(--app-scale))] flex-col items-center justify-center px-[calc(30px*var(--app-scale))] text-center"
    >
      <Result
        status={code}
        title={title}
        description={description}
        extra={
          <>
            {onRetry && retryLabel && (
              <Button size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {secondaryAction}
            <Link to={homeTo} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>
              {backHomeLabel}
            </Link>
            {linkAction}
          </>
        }
      />
      {traceId && (
        <p className="mt-[calc(12px*var(--app-scale))] font-mono text-[calc(11px*var(--app-scale))] text-(--text-faint)">
          {traceId}
        </p>
      )}
    </div>
  );
}
