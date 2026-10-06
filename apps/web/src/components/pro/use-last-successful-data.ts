import { useState } from 'react';

/**
 * 记住最近一次拿到的非空数据，请求失败（`data` 变 undefined）时把它交还给调用方。
 *
 * TanStack 的 `keepPreviousData` 只在「换 key 且 pending」时顶位；一旦新 key 请求**失败**，
 * `data` 就是 undefined，页面会退化成整页错误、丢掉旧行。D21 要求错误态保留旧数据（减淡）+ 顶部通条，
 * 所以由消费方在渲染层留住上一份成功数据。
 *
 * 用「渲染期同步 setState」而不是 ref（React 官方的 adjusting-state-on-props-change 模式）：
 * 同一次渲染内 React 会立即重跑本组件，不会多刷一帧。
 */
export function useLastSuccessfulData<T>(data: T | undefined): T | undefined {
  const [last, setLast] = useState<T | undefined>(data);
  if (data !== undefined && data !== last) setLast(data);
  return data ?? last;
}
