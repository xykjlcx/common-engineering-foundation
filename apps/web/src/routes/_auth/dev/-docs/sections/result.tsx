import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from '@/config';
import { Button } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';
import { ErrorScreen } from '@/components/pro/ErrorScreen';

// 结果页族状态矩阵（Result 四语义 + 三错误码 + compact + 补充块，外加 ErrorScreen 整页三型）。
// 说明：Result 的示例文案直接取自原型板（DSAdditions 4.7）的板上原文，作为夹具数据不进 i18n 资源；
// ErrorScreen 段沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

// 4.7 ② 失败明细：板上三行 L12 / L47 / L63
const failedRows = [
  { line: 'L12', message: '手机号已存在：138****2201' },
  { line: 'L47', message: '部门「市场部-华南」不存在' },
  { line: 'L63', message: '入职日期格式错误：2026/9/1' },
];

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`stepsResult.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

/** 板 4.7 失败明细块：26 高行 + 44 宽 mono 行号 + 12px 正文，作为 Result 的 children 传入 */
function FailedDetail(): JSX.Element {
  return (
    <div>
      {failedRows.map((row, index) => (
        <div
          key={row.line}
          className={
            index === failedRows.length - 1
              ? 'flex h-[calc(26px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))] px-[calc(10px*var(--app-scale))] text-[calc(12px*var(--app-scale))]'
              : 'flex h-[calc(26px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))] border-b border-(--divider) px-[calc(10px*var(--app-scale))] text-[calc(12px*var(--app-scale))]'
          }
        >
          <span className="w-[calc(44px*var(--app-scale))] font-mono text-(--text-3)">{row.line}</span>
          <span className="text-(--text)">{row.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResultMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section data-testid="resultMatrix" className="mt-8 rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">结果页族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          Result（四语义 + 三错误码 + compact + 补充块） · ErrorScreen（整页 403 / 404 / 500）
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Cell id="Result.success" title="Result · 操作完成（48 软底圆 + 双动作）">
            <Result
              status="success"
              title="导入完成"
              description="已导入 128 条用户，跳过 3 条重复记录。"
              extra={
                <>
                  <Button size="sm">查看用户</Button>
                  <Button size="sm" variant="secondary">
                    继续导入
                  </Button>
                </>
              }
            />
          </Cell>

          <Cell id="Result.error" title="Result · 失败（动作行下挂 children 明细块）">
            <Result
              status="error"
              title="导入失败"
              description="3 条记录未通过校验，已全部回滚，请修正后重新上传。"
              extra={
                <>
                  <Button size="sm">重新上传</Button>
                  <Button size="sm" variant="secondary">
                    下载错误报告
                  </Button>
                </>
              }
            >
              <FailedDetail />
            </Result>
          </Cell>

          <Cell id="Result.warningCompact" title="Result · 提醒 compact（36 圆 / 13.5 标题）">
            <Result
              status="warning"
              compact
              title="登录凭据即将过期"
              description="3 天后需重新登录，建议现在更新密码。"
              extra={
                <Button size="sm" variant="secondary">
                  去更新
                </Button>
              }
            />
          </Cell>

          <Cell id="Result.info" title="Result · 提示（info 软底圆）">
            <Result
              status="info"
              title="本月账期已锁定"
              description="锁定期内只能查看，解锁需财务主管审批。"
              extra={
                <Button size="sm" variant="secondary">
                  申请解锁
                </Button>
              }
            />
          </Cell>

          <Cell id="Result.403" title="Result · 403（34px mono 灰码 + 文字动作）">
            <Result
              status="403"
              title="没有访问权限"
              description="当前角色未开通「角色管理」，联系管理员申请。"
              extra={
                <>
                  <Button size="sm" variant="secondary">
                    返回上一页
                  </Button>
                  <Button size="sm" variant="link">
                    申请权限
                  </Button>
                </>
              }
            />
          </Cell>

          <Cell id="Result.404" title="Result · 404（无动作行）">
            <Result status="404" title="页面不存在" description="这个地址没有对应页面。" />
          </Cell>

          <Cell id="Result.500" title="Result · 500（compact + 单动作）">
            <Result
              status="500"
              compact
              title="服务暂时不可用"
              description="请稍后重试，若持续失败请把编号给运维。"
              extra={<Button size="sm">重试</Button>}
            />
          </Cell>
        </div>

        <div data-testid="errorScreenMatrix" className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.errorScreenMatrix')}</p>
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded-md border border-border bg-surface p-4">
              <ErrorScreen
                code="403"
                title={t('dev.themeStates.error403Title')}
                description={t('dev.themeStates.error403Desc')}
                backHomeLabel={t('dev.themeStates.errorHome')}
                homeTo={appConfig.routes.home}
                secondaryAction={
                  <Button size="sm" variant="secondary">
                    {t('dev.themeStates.error403Back')}
                  </Button>
                }
                linkAction={
                  <Button size="sm" variant="link">
                    {t('dev.themeStates.error403Apply')}
                  </Button>
                }
                traceId={t('dev.themeStates.error403Trace')}
              />
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <ErrorScreen
                code="404"
                title={t('dev.themeStates.error404Title')}
                description={t('dev.themeStates.error404Desc')}
                backHomeLabel={t('dev.themeStates.errorHome')}
                homeTo={appConfig.routes.home}
                secondaryAction={
                  <Button size="sm" variant="secondary">
                    {t('dev.themeStates.error404Search')}
                  </Button>
                }
              />
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <ErrorScreen
                code="500"
                title={t('dev.themeStates.error500Title')}
                description={t('dev.themeStates.error500Desc')}
                backHomeLabel={t('dev.themeStates.errorHome')}
                homeTo={appConfig.routes.home}
                retryLabel={t('dev.themeStates.error500Retry')}
                onRetry={() => undefined}
                linkAction={
                  <Button size="sm" variant="link">
                    {t('dev.themeStates.error500Copy')}
                  </Button>
                }
                traceId={t('dev.themeStates.error500Trace')}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
