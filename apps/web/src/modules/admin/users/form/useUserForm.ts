import { generateUserPassword } from '../model';
import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { UserFormSchema, type UserFormInput, type UserDetailDto } from '../api';

export function emptyUserForm(): UserFormInput {
  return {
    avatarId: null,
    name: '',
    username: '',
    password: generateUserPassword(),
    employeeNo: null,
    phone: '',
    email: null,
    gender: null,
    deptId: null,
    postId: null,
    managerId: null,
    employmentType: null,
    employmentStatus: null,
    joinedAt: null,
    workLocation: null,
    roleIds: [],
    mustChangePassword: true,
    effectiveAt: null,
    remark: null,
  };
}
export function toFormValues(user: UserDetailDto): UserFormInput {
  return {
    avatarId: user.avatarId,
    name: user.name,
    username: user.account,
    password: generateUserPassword(),
    employeeNo: user.employeeNo,
    phone: user.phone,
    email: user.email,
    gender: user.gender,
    deptId: user.deptId,
    postId: user.postId,
    managerId: user.managerId,
    employmentType: user.employmentType,
    employmentStatus: user.status,
    joinedAt: user.joinedAt,
    workLocation: user.workLocation,
    roleIds: [...user.roleIds],
    mustChangePassword: user.mustChangePassword,
    effectiveAt: user.effectiveAt,
    remark: user.remark,
  };
}

export function useUserForm(user: UserDetailDto | undefined): UseFormReturn<UserFormInput> & {
  getBaseline: () => UserDetailDto | undefined;
  reloadFrom: (user: UserDetailDto) => void;
} {
  const form = useForm<UserFormInput>({
    resolver: zodResolver(UserFormSchema),
    mode: 'onBlur',
    defaultValues: emptyUserForm(),
  });

  const { reset } = form;
  const initializedId = useRef<string | undefined>(undefined);
  const baseline = useRef<UserDetailDto | undefined>(undefined);
  useEffect(() => {
    if (!user || initializedId.current === user.id) return;
    initializedId.current = user.id;
    baseline.current = user;
    reset(toFormValues(user));
  }, [reset, user]);

  return {
    ...form,
    getBaseline: () => baseline.current,
    reloadFrom: (next) => {
      baseline.current = next;
      reset(toFormValues(next));
    },
  };
}
