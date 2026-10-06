import { pino, type Logger } from 'pino';

export type { Logger };

export interface LoggerOptions {
  level?: string;
  /** 开发态美化输出；生产/测试关闭 */
  pretty?: boolean;
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  return pino({
    level: opts.level ?? 'info',
    ...(opts.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}

/** 测试/缺省装配用的静默兜底（fail-open 路径的日志绝不能自己再抛错） */
export const silentLogger: Logger = pino({ level: 'silent' });
