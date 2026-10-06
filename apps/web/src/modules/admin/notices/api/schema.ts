import type { rpc } from '@/lib/rpc/client';
export { CreateNoticeSchema } from '@keel/core/notice-contract';
export type NoticeDto = Awaited<ReturnType<typeof rpc.notice.detail>>;
export type NoticeListParams = Parameters<typeof rpc.notice.list>[0];
