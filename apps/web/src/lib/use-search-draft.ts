import { useEffect, useRef, useState } from 'react';

/** 输入框草稿 → 防抖写回 URL；URL 反向变化（返回、外部改 search）时同步回草稿 */
export function useSearchDraft(value: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  if (value !== committed) {
    setCommitted(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === committed) return;
    const timer = setTimeout(() => commitRef.current(draft), 250);
    return () => clearTimeout(timer);
  }, [committed, draft]);
  return [draft, setDraft] as const;
}
