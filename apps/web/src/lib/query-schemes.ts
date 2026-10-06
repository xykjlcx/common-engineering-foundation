import { rpc } from '@/lib/rpc/client';

type CreateInput = Omit<Parameters<typeof rpc.queryScheme.create>[0], 'resource'>;
type UpdateInput = Omit<Parameters<typeof rpc.queryScheme.update>[0], 'resource'>;
type DeleteInput = Omit<Parameters<typeof rpc.queryScheme.delete>[0], 'resource'>;

export const querySchemeKeys = {
  all: ['querySchemes'] as const,
  resource: (resource: string) => [...querySchemeKeys.all, resource] as const,
};

export const querySchemeApi = {
  list: (resource: string, signal?: AbortSignal) => rpc.queryScheme.list({ resource }, { signal }),
  create: (resource: string, input: CreateInput) => rpc.queryScheme.create({ ...input, resource }),
  update: (resource: string, input: UpdateInput) => rpc.queryScheme.update({ ...input, resource }),
  delete: (resource: string, input: DeleteInput) => rpc.queryScheme.delete({ ...input, resource }),
};
