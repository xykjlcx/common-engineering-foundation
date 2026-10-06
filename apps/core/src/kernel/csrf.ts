// SameSite=Lax 允许跨站顶层 GET 导航，因此携带会话 Cookie 的 GET 也需同源检查。

export interface CsrfRequestFacts {
  hasSessionCookie: boolean;
  secFetchSite: string | null;
  origin: string | null;
  referer: string | null;
  /** 比对基准 Host：可信代理模式下为 X-Forwarded-Host ?? Host，缺省态恒为 Host */
  requestHost: string | null;
  /** CORS 白名单（与 app.ts allowList 同源）；null = 开发便利态（与 CORS 反射任意 Origin 同步放行） */
  corsOrigins: readonly string[] | null;
}

/** 强制 JSON 使无 Cookie 的登录请求也受跨域预检约束，阻断表单登录 CSRF。 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function contentTypeRejectReason(f: {
  method: string;
  contentType: string | null;
  allowMultipart?: boolean;
}): string | null {
  if (SAFE_METHODS.has(f.method.toUpperCase())) return null;
  const ct = (f.contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (ct === 'application/json' || (f.allowMultipart === true && ct === 'multipart/form-data')) return null;
  return ct.length === 0 ? 'content_type_missing' : 'content_type_not_json';
}

export function csrfRejectReason(f: CsrfRequestFacts): string | null {
  if (!f.hasSessionCookie) return null;
  if (f.corsOrigins === null) return null;

  if (f.secFetchSite) {
    if (f.secFetchSite !== 'cross-site') return null;
    if (f.origin !== null && f.corsOrigins.includes(f.origin)) return null;
    return 'cross_site';
  }

  // 沙箱 iframe / data: 页面的 Origin 字面量 "null"——不可信来源
  if (f.origin === 'null') return 'null_origin';
  const source = f.origin ?? f.referer;
  if (source === null) return null;

  let srcOrigin: string;
  let srcHost: string;
  try {
    const u = new URL(source);
    srcOrigin = u.origin;
    srcHost = u.host;
  } catch {
    return 'unparsable_origin';
  }
  if (f.corsOrigins.includes(srcOrigin)) return null;
  if (f.requestHost !== null && srcHost === f.requestHost) return null;
  return 'origin_mismatch';
}
