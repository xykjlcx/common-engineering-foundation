import { createHash, randomBytes } from 'node:crypto';

export function uuidv7(at: Date = new Date()): string {
  const ts = BigInt(at.getTime());
  const rand = randomBytes(10);
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(Number(ts >> 16n), 0, 4);
  bytes.writeUInt16BE(Number(ts & 0xffffn), 4);
  bytes[6] = 0x70 | (rand[0]! & 0x0f); // version 7
  bytes[7] = rand[1]!;
  bytes[8] = 0x80 | (rand[2]! & 0x3f); // variant
  for (let i = 3; i < 10; i++) bytes[i + 6] = rand[i]!;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** seed 命名空间（固定值，跨环境派生同一主键；变更即全量重种） */
export const SEED_NAMESPACE = '6f9619ff-8b86-d011-b42d-00c04fc964ff';

/** UUIDv5（RFC 4122 §4.3）：只服务 seed 固定装置行 */
export function uuidv5(name: string, namespace: string = SEED_NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const digest = createHash('sha1').update(ns).update(Buffer.from(name, 'utf8')).digest();
  const bytes = digest.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
