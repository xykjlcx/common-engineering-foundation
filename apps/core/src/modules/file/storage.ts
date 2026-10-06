import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadFileStorageDir } from '../../env.js';
import { ValidationError } from '../../kernel/errors.js';

function objectPath(storageKey: string): string {
  // 只接受服务端 randomUUID() + 已验证图片后缀；不消费用户文件名或路径。
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(storageKey)
  )
    throw new ValidationError('file.storage.invalid_key');
  return path.join(loadFileStorageDir(), storageKey);
}

/** 单机本地持久卷适配：生产必须配置专用目录；不适用于无共享卷的多实例部署。 */
export async function writeAvatarObject(storageKey: string, file: File): Promise<void> {
  const target = objectPath(storageKey);
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(target, new Uint8Array(await file.arrayBuffer()), { flag: 'wx', mode: 0o600 });
}

export async function readAvatarObject(storageKey: string, mimeType: string): Promise<File> {
  const bytes = await readFile(objectPath(storageKey));
  return new File([bytes], storageKey, { type: mimeType });
}

/** unlink 不递归、不跟随符号链接；已不存在代表前次磁盘删除已完成，可安全重试。 */
export async function deleteAvatarObject(storageKey: string): Promise<void> {
  const target = objectPath(storageKey);
  try {
    await unlink(target);
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}
