import type { rpc } from '@/lib/rpc/client';

export { CreatePostSchema, UpdatePostSchema } from '@keel/core/post-contract';
export type PostDto = Awaited<ReturnType<typeof rpc.post.detail>>;
export type PostsQueryParams = { keyword: string; filters?: string; page: number; pageSize: number };
