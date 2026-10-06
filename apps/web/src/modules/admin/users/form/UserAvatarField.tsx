import { useQuery } from '@tanstack/react-query';
import { settingsConstraintsQuery } from '@/modules/admin/settings/api';
import { useRef, useState } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { isDemoBuild } from '@/config';
import { AvatarUploadRow } from '@/components/pro/AvatarUploadRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { userApi, type UserFormInput } from '../api';
import { UserAvatar } from '../components/UserAvatar';

export function UserAvatarField({
  control,
  onUploadingChange,
}: {
  control: Control<UserFormInput>;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const constraints = useQuery({ ...settingsConstraintsQuery, enabled: !isDemoBuild });
  const maxMiB = constraints.data?.uploads.avatarMaxMiB ?? 2;
  const name = useWatch({ control, name: 'name' });
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Controller
      control={control}
      name="avatarId"
      render={({ field }) => {
        const upload = async (file: File | undefined) => {
          if (!file || lock.current) return;
          setError(undefined);
          if (
            file.size > maxMiB * 1024 * 1024 ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
          ) {
            setError(t('settings.avatarRequirements', { size: maxMiB }));
            return;
          }
          lock.current = true;
          setUploading(true);
          onUploadingChange(true);
          try {
            const result = await userApi.uploadAvatar(file);
            field.onChange(result.fileId);
          } catch {
            setError(t('users.avatar.failed'));
          } finally {
            lock.current = false;
            setUploading(false);
            onUploadingChange(false);
          }
        };
        return (
          <Field>
            <FieldLabel>{t('users.form.avatar')}</FieldLabel>
            <AvatarUploadRow
              preview={
                <UserAvatar
                  name={name}
                  src={field.value ? `/api/v1/files/${field.value}` : null}
                  size="form"
                />
              }
              actions={
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-describedby={error ? 'user-avatar-error' : undefined}
                    disabled={isDemoBuild}
                    loading={uploading}
                    onClick={() => input.current?.click()}
                  >
                    {t('users.form.changeAvatar')}
                  </Button>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      onClick={() => field.onChange(null)}
                    >
                      {t('users.form.removeAvatar')}
                    </Button>
                  )}
                  <Input
                    type="file"
                    ref={input}
                    className="sr-only size-px"
                    aria-label={t('users.form.changeAvatar')}
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploading || isDemoBuild}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      void upload(file);
                    }}
                  />
                </>
              }
              error={error}
              hint={error ? undefined : t('settings.avatarRequirements', { size: maxMiB })}
            />
          </Field>
        );
      }}
    />
  );
}
