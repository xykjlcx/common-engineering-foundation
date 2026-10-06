import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ShellDepsProvider } from './shell/deps';
import { shellDeps } from './shell-deps';
import { queryClient } from './query';

// 全局 Provider 组合点：Query（服务端数据）+ Tooltip（Header 图标提示）+ Toaster（sonner 全局挂载点）
// + ShellDeps（把 Shell 声明的依赖接到具体业务包，见 shell-deps.ts）
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShellDepsProvider value={shellDeps}>
        <TooltipProvider delayDuration={200}>
          {children}
          {/* FormFeedback 板脚注：内容区顶部居中、最多堆叠 3 条。3 恰是 sonner 默认值，显式写出防无声破坏。 */}
          <Toaster position="top-center" closeButton visibleToasts={3} />
        </TooltipProvider>
      </ShellDepsProvider>
    </QueryClientProvider>
  );
}
