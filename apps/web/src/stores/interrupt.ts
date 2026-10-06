// src/stores/interrupt.ts —— 页内中断通条的纯客户端状态（会话过期 / 断网 / 已恢复）。
// 板（StateError.dc.html 第四格）：中断类问题用页内通条不用整页错误页；三种通条共用同一位置、同时只显示一条，
// 所以这里是「单值」不是列表。会话过期由 http 层 authEvents 广播，断网由 window online/offline 事件驱动（接线在 app/mount.tsx）。
import { create } from 'zustand';

export type InterruptKind = 'sessionExpired' | 'offline' | 'online';

interface InterruptStore {
  kind: InterruptKind | null;
  setSessionExpired: () => void;
  setOffline: () => void;
  setOnline: () => void;
  dismiss: () => void;
}

export const useInterrupt = create<InterruptStore>()((set, get) => ({
  kind: null,
  // 会话过期优先级最高：断网提示不能盖掉它（重连成功也不能把它变成「已恢复」）
  setSessionExpired: () => set({ kind: 'sessionExpired' }),
  setOffline: () => {
    if (get().kind !== 'sessionExpired') set({ kind: 'offline' });
  },
  // 只有从断网态恢复才显示「已连接」；正常状态下的 online 事件不弹通条
  setOnline: () => {
    if (get().kind === 'offline') set({ kind: 'online' });
  },
  dismiss: () => set({ kind: null }),
}));
