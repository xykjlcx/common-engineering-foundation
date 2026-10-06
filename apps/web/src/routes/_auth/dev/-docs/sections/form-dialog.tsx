import { useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogTitleClassName,
} from '@/components/ui/dialog';

// 弹窗族状态矩阵（Dialog title token 束的可截图载体 + Dialog 原点缩放）。
// 板：ModalOrigin.dc.html。
// 说明：title 段沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改；
// 原点缩放段的夹具文案直接取板上原文，不进 i18n 资源。

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`toolbarFullscreen.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function FormDialogMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section
      data-testid="formDialogMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.dialogMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.dialogMatrixDesc')}</p>
      </div>

      <div className="grid gap-6">
        {/* Dialog 组件必须 portal + open 才渲染 DialogTitle（radix useDialogContext 无 provider 会抛错），
            portal 到 body 又会脱离本 section 打断矩阵截图——照 step8 弹层块先例静态内嵌 raw 预览。
            dialog-title 元素的排印类 import dialog.tsx 导出的 dialogTitleClassName 单一真相源，
            与真实 DialogTitle 共用同一常量（防漂移），作 title token 束的可截图载体。 */}
        <div data-testid="dialogTitleMatrix" className="grid gap-4 md:grid-cols-2">
          <div
            data-slot="dialog-content"
            className="grid gap-4 rounded-14 border border-(--overlay-border) bg-(--overlay-bg) p-6 text-(--overlay-fg) shadow-(--overlay-shadow-modal)"
          >
            <div className="flex flex-col gap-2">
              <div data-slot="dialog-title" className={dialogTitleClassName}>
                {t('dev.themeStates.dialogTitle')}
              </div>
              <p data-slot="dialog-description" className="text-sm text-(--type-2-fg)">
                {t('dev.themeStates.dialogDescription')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">{t('dev.themeStates.dialogCancel')}</Button>
              <Button variant="danger">{t('dev.themeStates.dialogConfirm')}</Button>
            </div>
          </div>
        </div>

        <div data-testid="formDialogLifecycleMatrix" className="flex flex-wrap gap-3">
          <LifecycleExample state="ready" />
          <LifecycleExample state="pending" />
          <LifecycleExample state="error" />
          <LifecycleExample state="targets" />
        </div>
        <div data-testid="dialogOriginMatrix" className="grid gap-4">
          <Cell id="Dialog.zoomFromPointer" title="Dialog 从点击点缩放：点哪个钮就从哪儿放大，关闭缩回同一点">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="primary">
                    从这里新建
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新建用户</DialogTitle>
                    <DialogDescription>创建后默认发送激活邮件，首次登录需修改密码</DialogDescription>
                  </DialogHeader>
                  <p className="text-sm text-(--type-2-fg)">
                    弹窗的 transform-origin = 最近一次 pointerdown 坐标 − 弹窗左上角。
                    换个角落的按钮再点一次，进退场原点随之改变。
                  </p>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button type="button" onClick={() => setDialogOpen(false)}>
                      创建
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>
                右边这个钮打开（原点跟着变）
              </Button>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}

function LifecycleExample({ state }: { state: 'ready' | 'pending' | 'error' | 'targets' }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const labels = {
    ready: '输入后按 Enter 提交',
    pending: '提交中禁止关闭',
    error: '失败保留草稿',
    targets: '展开全部目标',
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => setError(state === 'error' ? '保存失败，请重试。' : undefined)}
        >
          {labels[state]}
        </Button>
      </DialogTrigger>
      <FormDialogContent
        title={labels[state]}
        description="字段校验与请求属于业务；弹窗统一管理提交和关闭。"
        cancelText="取消"
        submitText="保存"
        error={error}
        submitLoading={pending}
        targets={
          state === 'targets'
            ? {
                summary: '查看全部 20 名目标用户',
                items: Array.from({ length: 20 }, (_, index) => ({
                  id: String(index),
                  label: `用户 ${index + 1}`,
                })),
              }
            : undefined
        }
        onCancel={() => setOpen(false)}
        onSubmit={async () => {
          if (state === 'pending') {
            setPending(true);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            setPending(false);
          }
          if (state === 'error') {
            setError('保存失败，请重试。');
            return;
          }
          setOpen(false);
        }}
      >
        <Input aria-label="名称" defaultValue="保留的草稿" />
      </FormDialogContent>
    </Dialog>
  );
}
