import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userApi } from '../api/user';
import { FileDropzone } from '@/components/pro/FileDropzone';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { userKeys } from '../api/keys';
import { parseUserImportCsv } from './import-csv';

type Preview = Awaited<ReturnType<typeof userApi.previewImport>>;
const importFieldLabels: Record<string, string> = {
  username: 'users.form.account',
  name: 'users.form.name',
  password: 'users.form.initialPassword',
  email: 'users.form.email',
  phone: 'users.form.phone',
  employeeNo: 'users.form.employeeNo',
  deptId: 'users.form.dept',
  managerId: 'users.form.manager',
  roleIds: 'users.form.role',
  postName: 'users.form.postId',
  gender: 'users.form.gender',
  employmentType: 'users.form.employmentType',
  employmentStatus: 'users.columns.status',
  joinedAt: 'users.form.joinedAt',
  workLocation: 'users.form.workLocation',
  remark: 'users.form.remark',
  mustChangePassword: 'users.form.mustChangePassword',
  effectiveAt: 'users.form.effectiveAt',
  avatarId: 'users.form.avatar',
};
const importIssueMessages: Record<string, string> = {
  'validation.too_small': 'tooSmall',
  'validation.too_big': 'tooBig',
  'validation.invalid_type': 'invalidType',
  'validation.invalid_format': 'invalidFormat',
  'validation.invalid_value': 'invalidValue',
  'validation.unrecognized_keys': 'unknownFields',
  'validation.custom': 'invalidValue',
  'validation.failed': 'invalidValue',
  'user.import_duplicate': 'duplicateInFile',
  'user.username_conflict': 'alreadyUsed',
  'user.email_conflict': 'alreadyUsed',
  'user.employee_no_conflict': 'alreadyUsed',
  'post.not_found': 'referenceUnavailable',
  'post.disabled': 'referenceUnavailable',
  'dept.not_found': 'referenceUnavailable',
  'dept.disabled': 'referenceUnavailable',
  'user.manager_not_found': 'referenceUnavailable',
  'role.not_found': 'referenceUnavailable',
  'file.avatar.not_found': 'referenceUnavailable',
  'user.manager_self_forbidden': 'managerSelf',
  'user.role_grant_conflict': 'referenceUnavailable',
  'permission.denied': 'permissionDenied',
  'permission.escalation_denied': 'permissionDenied',
  'user.import_invalid': 'invalidValue',
};
function importIssueText(issue: Preview['rows'][number]['issues'][number], t: TFunction<'admin'>) {
  const field = issue.field.split('.')[0] ?? '';
  const labelKey = importFieldLabels[field];
  let messageKey = importIssueMessages[issue.code] ?? 'unknown';
  if (
    issue.code === 'validation.invalid_format' &&
    ['deptId', 'managerId', 'roleIds', 'avatarId'].includes(field)
  )
    messageKey = 'referenceFormat';
  if (issue.code === 'validation.invalid_format' && field === 'joinedAt') messageKey = 'dateFormat';
  if (issue.code === 'validation.invalid_format' && field === 'effectiveAt') messageKey = 'timeFormat';
  if (issue.code === 'validation.too_small' && field === 'password') messageKey = 'passwordTooSmall';
  if (issue.code === 'validation.too_small' && field === 'name') messageKey = 'required';
  if (issue.code === 'validation.invalid_value' && field === 'employmentStatus')
    messageKey = 'employmentStatus';
  if (issue.code === 'validation.invalid_value' && field === 'gender') messageKey = 'gender';
  if (issue.code === 'validation.invalid_type' && field === 'mustChangePassword') messageKey = 'boolean';
  return t('users.import.issueText', {
    field: labelKey ? t(labelKey) : t('users.import.record'),
    message: t(`users.import.validation.${messageKey}`),
  });
}

export function UserImportDialog({
  open,
  canImport,
  onOpenChange,
}: {
  open: boolean;
  canImport: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const revision = useRef(0);
  const actionLock = useRef(false);
  const inspect = useMutation({ mutationFn: userApi.previewImport, gcTime: 0 });
  const submit = useMutation({ mutationFn: userApi.importUsers, gcTime: 0 });
  const busy = reading || inspect.isPending || submit.isPending;
  const close = () => {
    if (busy) return;
    revision.current++;
    setFile(null);
    setRows([]);
    setPreview(null);
    setError(null);
    inspect.reset();
    submit.reset();
    onOpenChange(false);
  };
  const select = async (files: File[]) => {
    const selected = files[0];
    if (!canImport || !selected || busy) return;
    const current = ++revision.current;
    setReading(true);
    setFile(selected);
    setRows([]);
    setPreview(null);
    setError(null);
    try {
      if (selected.size > 1_048_576) throw new Error('users.import.fileTooLarge');
      const parsed = parseUserImportCsv(await selected.text());
      if (revision.current === current) setRows(parsed);
    } catch (error) {
      if (revision.current === current)
        setError(error instanceof Error ? t(error.message) : t('users.import.invalidCsv'));
    } finally {
      if (revision.current === current) setReading(false);
    }
  };
  const precheck = async () => {
    if (!canImport || busy || actionLock.current || !rows.length) return;
    actionLock.current = true;
    setError(null);
    try {
      setPreview(await inspect.mutateAsync({ rows }));
    } catch {
      setError(t('users.import.previewFailed'));
    } finally {
      actionLock.current = false;
      inspect.reset();
    }
  };
  const commit = async () => {
    if (!canImport || busy || actionLock.current || !preview?.valid) return;
    actionLock.current = true;
    setError(null);
    try {
      await submit.mutateAsync({ rows });
      // 清空含临时口令的草稿和mutation变量，不进入查询缓存或持久状态。
      setRows([]);
      setFile(null);
      setPreview(null);
      submit.reset();
      await qc.invalidateQueries({ queryKey: userKeys.all });
      onOpenChange(false);
    } catch {
      setPreview(null);
      setError(t('users.import.submitFailed'));
      submit.reset();
    } finally {
      actionLock.current = false;
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <FormDialogContent
        size="lg"
        title={t('users.import.users')}
        description={t('users.import.instructions')}
        cancelText={t('users.actions.cancel')}
        submitText={t('users.import.commit')}
        submitLoading={submit.isPending}
        submitDisabled={!canImport || busy || !preview?.valid}
        onCancel={close}
        onSubmit={commit}
        error={error}
      >
        <FileDropzone
          label={t('users.import.chooseFile')}
          hint={t('users.import.fileHint')}
          inputLabel={t('users.import.chooseFile')}
          files={file ? [file] : []}
          accept=".csv,text/csv"
          disabled={!canImport || busy}
          onFiles={(files) => {
            void select(files);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!canImport || busy || !rows.length}
          loading={inspect.isPending}
          onClick={() => {
            void precheck();
          }}
        >
          {t('users.import.preview')}
        </Button>
        {preview ? (
          <section aria-live="polite">
            <p>
              {t(preview.valid ? 'users.import.valid' : 'users.import.invalid', {
                count: preview.rows.length,
              })}
            </p>
            {!preview.valid ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users.import.row')}</TableHead>
                    <TableHead>{t('users.import.issues')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows
                    .filter((row) => row.issues.length)
                    .map((row) => (
                      <TableRow key={row.row}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>
                          <ul className="grid gap-2">
                            {row.issues.map((issue, index) => (
                              <li key={`${issue.field}:${issue.code}:${index}`}>
                                <p>{importIssueText(issue, t)}</p>
                                <details>
                                  <summary>{t('users.import.technicalDetails')}</summary>
                                  <code>{`${issue.field || '—'}: ${issue.code}`}</code>
                                </details>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : null}
          </section>
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}
