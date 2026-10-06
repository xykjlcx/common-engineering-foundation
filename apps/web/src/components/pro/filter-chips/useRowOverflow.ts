// 与组件分文件：纯函数 computeVisibleCount 可单测，hook 只负责测量时机。
import { useEffect, useState } from 'react';

/**
 * 按每个 chip 的 offsetTop 分行，返回「前 maxRows 行能放下的 chip 数」。
 * 溢出时额外让出一格给「+N」chip（它接在最后一个可见 chip 后面，宽度不大于被让出的那个）。
 * 未溢出（含 jsdom 里 offsetTop 恒为 0 的场景）时返回全部。
 */
export function computeVisibleCount(tops: readonly number[], maxRows: number): number {
  if (maxRows < 1 || tops.length === 0) return tops.length;

  const rows: number[] = [];
  for (const top of tops) {
    if (!rows.includes(top)) rows.push(top);
  }
  if (rows.length <= maxRows) return tops.length;

  const limit = rows[maxRows - 1];
  if (limit === undefined) return tops.length;

  let count = 0;
  for (const top of tops) {
    if (top > limit) break;
    count += 1;
  }
  return Math.max(count - 1, 1);
}

export interface RowOverflow<E extends HTMLElement> {
  /** 挂到 chips 容器上 */
  containerRef: (node: E | null) => void;
  /** 可见 chip 数；测量落定前等于全部（测量必须在「全展开」布局下做） */
  visibleCount: number;
  /** 被折叠的 chip 数 */
  hiddenCount: number;
}

/**
 * 测量 chips 行溢出。测量始终发生在「全部渲染」的那一帧：
 * 只要 itemCount / maxRows / 容器宽度 变了，本轮测量结果就作废、先把全部 chip 渲染出来再量一次，
 * 因此不会出现「隐藏后再量 → 又放开 → 再隐藏」的抖动。
 */
export function useRowOverflow<E extends HTMLElement>({
  itemCount,
  maxRows,
  enabled,
  itemSelector,
}: {
  itemCount: number;
  maxRows: number;
  enabled: boolean;
  itemSelector: string;
}): RowOverflow<E> {
  const [node, setNode] = useState<E | null>(null);
  const [width, setWidth] = useState(0);
  const [measurement, setMeasurement] = useState<{ key: string; count: number } | null>(null);

  const key = `${itemCount}|${maxRows}|${enabled}|${width}`;

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? node.clientWidth;
      setWidth((current) => (current === next ? current : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  useEffect(() => {
    if (!node || !enabled || measurement?.key === key) return;
    // 下一帧再量：此刻 chips 全部在 DOM 里，offsetTop 才代表真实行位置
    const frame = requestAnimationFrame(() => {
      const tops = [...node.querySelectorAll<HTMLElement>(itemSelector)].map((item) => item.offsetTop);
      setMeasurement({ key, count: computeVisibleCount(tops, maxRows) });
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, itemSelector, key, maxRows, measurement, node]);

  const settled = enabled && measurement?.key === key;
  const visibleCount = settled ? Math.min(measurement.count, itemCount) : itemCount;
  return { containerRef: setNode, visibleCount, hiddenCount: Math.max(itemCount - visibleCount, 0) };
}
