import type { MeDto } from './schema';
export type OverviewIdentity = Pick<MeDto, 'userId' | 'permissions' | 'systemAdmin'>;
export { authKeys } from '../../auth/api/keys';
export { menuKeys } from '../../menus/api/keys';
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (timeZone: string, identity: OverviewIdentity) =>
    [
      ...dashboardKeys.all,
      'overview',
      timeZone,
      identity.userId,
      identity.systemAdmin,
      [...identity.permissions].sort(),
    ] as const,
  health: () => [...dashboardKeys.all, 'health'] as const,
};
