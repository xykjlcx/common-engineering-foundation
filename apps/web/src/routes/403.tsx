import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ErrorScreen } from '@/components/pro/ErrorScreen';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/config';

// 放在 _auth 外层，可独立访问；页面级守卫无权限时 beforeLoad throw redirect 到这里，并经 search 带来
// 「缺哪个权限点 + 当前角色」——板（StateError.dc.html 第一格）：错误页要说清发生了什么、给一条能走的路。
const searchSchema = z.object({
  need: z.string().optional(),
  roles: z.string().optional(),
});

export const Route = createFileRoute('/403')({
  validateSearch: searchSchema,
  component: ForbiddenRoute,
});

function ForbiddenRoute() {
  const { t } = useTranslation();
  const { need, roles } = Route.useSearch();
  const router = useRouter();
  const roleList = roles?.split(',').filter(Boolean) ?? [];

  return (
    <ErrorScreen
      code="403"
      title={t('errors.403')}
      description={
        need ? (
          <>
            {t('errors.403Desc')}
            <span className="font-mono text-(--type-2-fg)">{need}</span>
            {roleList.length > 0 && (
              <>
                <br />
                {t('errors.403Roles', { roles: roleList.join('、') })}
              </>
            )}
          </>
        ) : undefined
      }
      secondaryAction={
        <Button type="button" variant="outline" size="sm" onClick={() => router.history.back()}>
          {t('errors.goBack')}
        </Button>
      }
      backHomeLabel={t('errors.backHome')}
      homeTo={appConfig.routes.home}
    />
  );
}
