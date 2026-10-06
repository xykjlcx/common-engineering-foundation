import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateSpec } from '../src/openapi.js';

// 契约产物落盘：apps/core/openapi.json（提交入库）。
// 守卫 contract-artifact-diff 断言"产物 == 当前 router 生成结果"，改契约必须重跑本脚本。

const target = path.resolve(import.meta.dirname, '../openapi.json');
const spec = await generateSpec();
await writeFile(target, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
console.log(`[openapi] written ${target}`);
