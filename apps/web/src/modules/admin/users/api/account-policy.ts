import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangeAccountPolicySchema } from '@keel/core/user-contract';
import type { z } from 'zod';

import { isDemoBuild } from '@/config/env';
import { rpc } from '@/lib/rpc/client';
import { demoUser } from '../mocks/demo-user';
import { userKeys } from './keys';

export type AccountPolicyInput = z.infer<typeof ChangeAccountPolicySchema>;
export const accountPolicyApi = {
  change: (input: AccountPolicyInput) =>
    (isDemoBuild ? demoUser : rpc.user).changeAccountPolicy(ChangeAccountPolicySchema.parse(input)),
};
export function useAccountPolicyMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: accountPolicyApi.change,
    onSuccess: () => client.invalidateQueries({ queryKey: userKeys.all }),
  });
}
