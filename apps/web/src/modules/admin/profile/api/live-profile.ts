import { queryOptions } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { isDemoBuild } from '@/config/env';
import { UpdateOwnProfileSchema } from '@keel/core/profile-contract';
import { authApi } from '../../auth/api';
import { demoProfile } from '../mocks/demo-profile';
import { profileKeys } from './keys';

const profileClient = () => (isDemoBuild ? demoProfile : rpc.profile);

export type LiveProfileDto = Awaited<ReturnType<typeof rpc.profile.getProfile>>;
export type LiveProfilePatch = Parameters<typeof rpc.profile.updateProfile>[0];
export type LiveSessionDto = Awaited<ReturnType<typeof authApi.listSessions>>['sessions'][number];
export const liveProfileQuery = queryOptions({
  queryKey: profileKeys.detail(),
  queryFn: ({ signal }) => profileClient().getProfile({}, { signal }),
  staleTime: 0,
});
export const liveSessionsQuery = queryOptions({
  queryKey: profileKeys.devices(),
  queryFn: ({ signal }) => authApi.listSessions({ signal }),
  staleTime: 0,
});
export const liveProfileApi = {
  update: (input: LiveProfilePatch) => profileClient().updateProfile(UpdateOwnProfileSchema.parse(input)),
  revokeSession: authApi.revokeSession,
};
