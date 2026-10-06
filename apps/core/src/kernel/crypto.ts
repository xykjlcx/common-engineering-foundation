import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

// 会话 token 工艺：不透明 token（128bit 随机）只进 Cookie；库里只存 SHA-256。
// 任何调用方不得把原始 token 落库 / 落日志。

export function newSessionToken(): string {
  return randomBytes(16).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * argon2id 参数显式钉死，等于 @node-rs/argon2 2.2.0 的当前默认值
 * （memoryCost 19456 KiB / timeCost 2 / parallelism 1，即 OWASP 的 argon2id 第二档推荐）。
 * 不吃库默认值的理由：这三个数进哈希串，升级库把默认值调高会静默改变新口令的哈希形态，
 * 而库本身不会因此提醒——存量哈希仍能校验，新旧口令强度却已经不同了。改这里等于改口令策略。
 */
export const PASSWORD_HASH_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2Hash(plain, PASSWORD_HASH_OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await argon2Verify(passwordHash, plain);
  } catch {
    // 非法哈希格式一律按验证失败处理，不向上抛技术细节
    return false;
  }
}

/** 用户不存在时仍校验合法 argon2 哈希，避免快速拒绝暴露账号存在性。 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$oaz3b8KVjo+JAUryBlVziA$gbbgvQt0yip9PxiBW/IkKIqwIbA0LTmY0FDBcXC6Gf8';
