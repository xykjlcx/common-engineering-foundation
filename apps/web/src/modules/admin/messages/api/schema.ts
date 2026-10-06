import type { rpc } from '@/lib/rpc/client';
export type MessageDto = Awaited<ReturnType<typeof rpc.message.detail>>;
export type MessageListParams = Parameters<typeof rpc.message.list>[0];
