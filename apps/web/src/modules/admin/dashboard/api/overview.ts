import { queryOptions } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { dashboardKeys, type OverviewIdentity } from './keys';

export const overviewQuery = (
  identity: OverviewIdentity,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) =>
  queryOptions({
    queryKey: dashboardKeys.overview(timeZone, identity),
    queryFn: ({ signal }) => rpc.dashboard.overview({ timeZone }, { signal }),
    staleTime: 30_000,
  });
export const healthQuery = queryOptions({
  queryKey: dashboardKeys.health(),
  queryFn: ({ signal }) => rpc.system.health({}, { signal }),
  retry: false,
});
