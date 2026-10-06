import { ValidationError } from '../../../kernel/errors.js';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** 同时验证大小、声明 MIME 与文件头；文件名完全不参与存储定位。 */
export async function validateAvatar(
  file: File,
  maxBytes = MAX_AVATAR_BYTES,
): Promise<'png' | 'jpg' | 'webp'> {
  const invalid = () => new ValidationError('file.avatar_invalid', { maxBytes });
  if (file.size === 0 || file.size > maxBytes) throw invalid();
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (expected: readonly number[], offset = 0) =>
    expected.every((byte, index) => bytes[offset + index] === byte);
  if (file.type === 'image/png' && matches([137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
  if (file.type === 'image/jpeg' && matches([255, 216, 255])) return 'jpg';
  if (file.type === 'image/webp' && matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8)) return 'webp';
  throw invalid();
}
