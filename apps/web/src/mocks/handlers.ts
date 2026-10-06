// 全部 mock handlers 的聚合点；browser.ts 只依赖本文件，不直接罗列各域 handlers
import { authHandlers } from '@/modules/admin/auth/mocks';

export const allHandlers = [...authHandlers];
