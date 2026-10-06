import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FormDialogContent } from '@/components/pro/FormDialog';
import type { UsageDoc } from '../types';

/* 表单弹窗「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

const DeptSchema = z.object({
  name: z.string().min(2, '部门名称至少 2 个字'),
  leader: z.string().min(1, '请填写负责人'),
});

type DeptInput = z.infer<typeof DeptSchema>;

function BasicDemo() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<DeptInput | null>(null);
  const form = useForm<DeptInput>({
    resolver: zodResolver(DeptSchema),
    defaultValues: { name: '', leader: '' },
  });

  return (
    <div className="flex flex-col gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>新建部门</Button>
        </DialogTrigger>
        <FormDialogContent
          title="新建部门"
          description="部门建成后可以再调整上级与负责人。"
          cancelText="取消"
          submitText="保存"
          onCancel={() => setOpen(false)}
          onSubmit={form.handleSubmit((values) => {
            setSaved(values);
            setOpen(false);
          })}
        >
          <Field>
            <FieldLabel htmlFor="usage-dept-name" required>
              部门名称
            </FieldLabel>
            <Input id="usage-dept-name" {...form.register('name')} />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="usage-dept-leader" required>
              负责人
            </FieldLabel>
            <Input id="usage-dept-leader" {...form.register('leader')} />
            <FieldError>{form.formState.errors.leader?.message}</FieldError>
          </Field>
        </FormDialogContent>
      </Dialog>
      <p className="text-xs text-(--text-3)">
        {saved ? `已保存：${saved.name} / ${saved.leader}` : '尚未保存'}
      </p>
    </div>
  );
}

function ErrorDemo() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<DeptInput>({
    resolver: zodResolver(DeptSchema),
    defaultValues: { name: '技术中心', leader: '李长昕' },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">演示提交失败</Button>
      </DialogTrigger>
      <FormDialogContent
        title="编辑部门"
        size="sm"
        error={error}
        cancelText="取消"
        submitText="保存"
        submitLoading={submitting}
        onCancel={() => setOpen(false)}
        onSubmit={form.handleSubmit(() => {
          setSubmitting(true);
          setError('部门名称已存在，请换一个');
          setSubmitting(false);
        })}
      >
        <Field>
          <FieldLabel htmlFor="usage-dept-name-2" required>
            部门名称
          </FieldLabel>
          <Input id="usage-dept-name-2" {...form.register('name')} />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}

export const usage: UsageDoc = {
  when:
    '「填一张表然后提交」的弹窗一律用 FormDialogContent：标题区、字段区、错误条、右下角取消 / 提交双钮的排布是定死的，' +
    '业务层只往里塞字段，不再各页各写一套页脚。' +
    '它只是内容壳，开关由外面的 Dialog 控制（open / onOpenChange），所以同一个页面可以复用一个 Dialog 承载新建与编辑两种用途。' +
    '只需要用户点「确定 / 取消」而没有表单时不要用它，改用 pro/ConfirmDialog（带三档 severity）；表格行内的轻量确认用 pro/Popconfirm。',
  examples: [
    {
      title: 'react-hook-form + zod 标准表单',
      description: 'onSubmit 直接接 form.handleSubmit(...)：校验不过时它自己拦下来，不会走到提交回调。',
      code: `import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FormDialogContent } from '@/components/pro/FormDialog';

const DeptSchema = z.object({
  name: z.string().min(2, '部门名称至少 2 个字'),
  leader: z.string().min(1, '请填写负责人'),
});

type DeptInput = z.infer<typeof DeptSchema>;

export function DeptFormDialog({ onSubmit }: { onSubmit: (values: DeptInput) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<DeptInput>({
    resolver: zodResolver(DeptSchema),
    defaultValues: { name: '', leader: '' },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>新建部门</Button>
      </DialogTrigger>
      <FormDialogContent
        title="新建部门"
        description="部门建成后可以再调整上级与负责人。"
        cancelText="取消"
        submitText="保存"
        onCancel={() => setOpen(false)}
        onSubmit={form.handleSubmit((values) => {
          onSubmit(values);
          setOpen(false);
        })}
      >
        <Field>
          <FieldLabel htmlFor="dept-name" required>
            部门名称
          </FieldLabel>
          <Input id="dept-name" {...form.register('name')} />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dept-leader" required>
            负责人
          </FieldLabel>
          <Input id="dept-leader" {...form.register('leader')} />
          <FieldError>{form.formState.errors.leader?.message}</FieldError>
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}`,
      render: BasicDemo,
    },
    {
      title: '提交失败与加载态',
      description:
        'error 渲染成字段区顶部那条 role="alert" 的红条，用来放后端返回的整表错误；submitLoading 会同时锁住提交钮。',
      code: `import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormDialogContent } from '@/components/pro/FormDialog';

export function EditDeptDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<DeptInput>({
    resolver: zodResolver(DeptSchema),
    defaultValues: { name: '技术中心', leader: '李长昕' },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">编辑</Button>
      </DialogTrigger>
      <FormDialogContent
        title="编辑部门"
        size="sm"
        error={error}
        cancelText="取消"
        submitText="保存"
        submitLoading={submitting}
        onCancel={() => setOpen(false)}
        onSubmit={form.handleSubmit(async (values) => {
          setSubmitting(true);
          try {
            await save(values);
            setOpen(false);
          } catch {
            setError('部门名称已存在，请换一个');
          } finally {
            setSubmitting(false);
          }
        })}
      >
        <Field>
          <FieldLabel htmlFor="dept-name" required>
            部门名称
          </FieldLabel>
          <Input id="dept-name" {...form.register('name')} />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}`,
      render: ErrorDemo,
    },
  ],
  notes: [
    '组件真名是 FormDialogContent 不是 FormDialog：它只是 DialogContent 的一层壳，必须包在 <Dialog> 里才有开关语义。',
    '与 antd 的差异：antd 的 Modal 自带 open / onCancel / onOk 三件套；这里开关归 Dialog，onCancel / onSubmit 只是两个按钮的回调，关闭动作要自己调 onOpenChange(false)。',
    'antd 的 confirmLoading 在这里叫 submitLoading，okText / cancelText 叫 submitText / cancelText，且两个文案是必填的（pro 层不做 i18n，文案一律由业务层注入）。',
    'size 只有 sm / md / lg 三档（对应 sm:max-w-sm / lg / 640px），不接受任意 width。',
    '不写 description 时组件会显式传 aria-describedby={undefined} 关掉 Radix 的缺描述告警，所以不必自己补空描述。',
    'Dialog 的缩放动效以「上一次点击点」为原点，因此触发按钮建议用 DialogTrigger 包一层；用外部状态硬开的弹窗会退化成从中心缩放。',
    '字段区外层已经是 FieldGroup（纵向 gap-3），要做两列布局在 children 里自己套一层 grid sm:grid-cols-2 即可。',
  ],
};
