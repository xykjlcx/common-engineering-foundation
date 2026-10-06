import type { rpc } from '@/lib/rpc/client';

export {
  CreateDictTypeSchema,
  CreateDictItemSchema,
  UpdateDictTypeSchema,
  UpdateDictItemSchema,
  DICT_TONES,
} from '@keel/core/dict-contract';

export type DictType = Awaited<ReturnType<typeof rpc.dict.type>>;
export type DictItem = Awaited<ReturnType<typeof rpc.dict.item>>;
export type DictItemsParams = Parameters<typeof rpc.dict.items>[0];
