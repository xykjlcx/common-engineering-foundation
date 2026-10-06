import { ProfileViewSchema } from '@keel/core/profile-contract';
import type { rpc } from '@/lib/rpc/client';
import { BizError } from '@/lib/http/errors';

const now = () => new Date().toISOString();
let profile = ProfileViewSchema.parse({
  id: '00000000-0000-4000-8000-000000000001',
  username: 'admin',
  name: '演示管理员',
  email: 'demo@example.com',
  phone: '',
  deptId: null,
  managerId: null,
  avatarId: null,
  employeeNo: null,
  postId: null,
  postName: null,
  gender: null,
  employmentType: null,
  employmentStatus: null,
  joinedAt: null,
  workLocation: null,
  remark: null,
  accountStatus: 'enabled',
  avatar: null,
  systemAdmin: true,
  roleIds: [],
  mustChangePassword: false,
  effectiveAt: null,
  version: 0,
  createdAt: now(),
  updatedAt: now(),
  lastLoginAt: null,
  deptName: null,
  managerName: null,
  roleNames: [],
});

export const demoProfile: Pick<typeof rpc.profile, 'getProfile' | 'updateProfile'> = {
  getProfile: () => Promise.resolve(profile),
  updateProfile: async (input) => {
    if (input.version !== profile.version)
      throw new BizError({
        code: 'user.version_conflict',
        status: 409,
        instance: null,
        traceId: null,
        retryAfter: null,
      });
    profile = ProfileViewSchema.parse({
      ...profile,
      ...input,
      version: profile.version + 1,
      updatedAt: now(),
    });
    return profile;
  },
};
