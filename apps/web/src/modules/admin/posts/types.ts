import type { PostsQueryParams } from './api';

export type PostsSearch = PostsQueryParams;

export interface PostsPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  search: PostsSearch;
  onSearchChange: (patch: Partial<PostsSearch>) => void;
}

export type PostDialog = { kind: 'create' } | { kind: 'edit' | 'delete'; id: string };
