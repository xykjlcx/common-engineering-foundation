// XFF 左侧可被客户端伪造，只能按部署声明的可信代理跳数取值。

/** IPv6 文本最大长度（IPv4-mapped 形态最长，如 ::ffff:255.255.255.255） */
const MAX_IP_LENGTH = 45;
/** 保守形态校验：只放行 IPv4 / IPv6 字面量可能用到的字符，挡住任意 payload 落库 */
const IP_SHAPE_RE = /^[0-9a-fA-F:.]+$/;

/** `::ffff:127.0.0.1` → `127.0.0.1`（IPv4-mapped IPv6 归一，否则同一客户端两种写法各算一份计数） */
function normalize(raw: string): string | null {
  const ip = raw.trim();
  if (ip.length === 0 || ip.length > MAX_IP_LENGTH || !IP_SHAPE_RE.test(ip)) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  return mapped?.[1] ?? ip;
}

export interface ClientIpFacts {
  /** X-Forwarded-For 原始头（可能含多跳，逗号分隔） */
  xff: string | null;
  /** 真实 socket 远端地址（@hono/node-server conninfo） */
  socketIp: string | null;
  /**
   * 可信代理跳数：0 = 不信任 XFF（缺省）；n ≥ 1 = 本服务前有 n 层可信代理，
   * 取 XFF **从右往左**第 n 跳（右侧是离本服务最近、由可信代理追加的条目，
   * 左侧可由客户端任意伪造）。
   */
  trustedProxyHops: number;
}

/**
 * 返回归一后的客户端 IP；无法可信判定时返回 null（宁可无 IP，不要错 IP——
 * 错 IP 会让限速打到无辜第三方）。
 */
export function clientIpFrom(f: ClientIpFacts): string | null {
  const socket = f.socketIp === null ? null : normalize(f.socketIp);
  if (f.trustedProxyHops <= 0) return socket;

  const chain = (f.xff ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // 链上条目不足声明跳数 = 请求没经过声明的代理层（直连或配置错），退回 socket
  const idx = chain.length - f.trustedProxyHops;
  if (idx < 0) return socket;
  const candidate = chain[idx];
  return candidate === undefined ? socket : (normalize(candidate) ?? socket);
}
