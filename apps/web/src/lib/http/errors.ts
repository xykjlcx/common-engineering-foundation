export interface BizErrorDetails {
  status: number;
  code: string;
  /** RFC7807 detail：后端 Problem 不产该字段，缺失回退 title → code（ADR-010 决策五） */
  detail?: string | null;
  /** RFC7807 title：后端恒为 code，作 detail 缺失时的回退源 */
  title?: string | null;
  /** code+params 前端 i18n 渲染通道（ADR-005：后端不拼文案） */
  params?: Record<string, unknown>;
  traceId: string | null;
  instance: string | null;
  retryAfter: number | null;
}

export class BizError extends Error {
  readonly status: number;
  readonly code: string;
  /** 展示级消息：detail ?? title ?? code（恒为字符串，现有消费方零改动） */
  readonly detail: string;
  readonly params: Record<string, unknown>;
  readonly traceId: string | null;
  readonly instance: string | null;
  readonly retryAfter: number | null;

  constructor(details: BizErrorDetails, options?: ErrorOptions) {
    const message = details.detail ?? details.title ?? details.code;
    super(message, options);
    this.name = 'BizError';
    this.status = details.status;
    this.code = details.code;
    this.detail = message;
    this.params = details.params ?? {};
    this.traceId = details.traceId;
    this.instance = details.instance;
    this.retryAfter = details.retryAfter;
  }
}
export class AuthExpiredError extends Error {
  name = 'AuthExpiredError';
}
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class ContractError extends Error {
  issues: unknown;
  constructor(message: string, issues: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContractError';
    this.issues = issues;
  }
}
