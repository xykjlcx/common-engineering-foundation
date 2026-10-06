import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corePort = Number(process.env.KEEL_CORE_PORT ?? 3100);
const webPort = Number(process.env.KEEL_WEB_PORT ?? 5174);
const dataDir = resolve(process.env.KEEL_DEV_DATA_DIR ?? resolve(root, '.pglite/dev'));
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid) process.kill(-child.pid, 'SIGTERM');
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function assertPortFree(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${port}`);
  for (const host of ['localhost', '127.0.0.1']) {
    const server = createServer();
    await new Promise((accept, reject) => {
      server.once('error', () =>
        reject(
          new Error(
            `端口 ${port} 已占用。请关闭旧服务，或设置 KEEL_CORE_PORT / KEEL_WEB_PORT；不会自动切到另一端口。`,
          ),
        ),
      );
      server.listen({ port, host }, () => server.close(accept));
    });
  }
}

const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_DRIVER: 'pglite',
  PGLITE_DATA_DIR: resolve(dataDir, 'database'),
  FILE_STORAGE_DIR: resolve(dataDir, 'files'),
  PORT: String(corePort),
  VITE_CORE_ORIGIN: `http://127.0.0.1:${corePort}`,
  VITE_ENABLE_MOCK: 'false',
};
function run(command, args, cwd, persistent = false) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', detached: true });
  children.add(child);
  return new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      children.delete(child);
      if (persistent && !stopping) stop(code || 1);
      if (code === 0 || stopping) accept();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}
async function waitForCore() {
  for (let attempt = 0; attempt < 150 && !stopping; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${corePort}/healthz`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      /* 启动期间尚未监听，继续等待。 */
    }
    await new Promise((accept) => setTimeout(accept, 200));
  }
  throw new Error('后端启动失败，请检查上方日志。');
}

try {
  await assertPortFree(corePort);
  await assertPortFree(webPort);
  await mkdir(dataDir, { recursive: true });
  const core = resolve(root, 'apps/core');
  console.log(
    `Keel 全栈开发\n代码：${root}\n数据：${dataDir}\n页面：http://localhost:${webPort}\n后端：http://127.0.0.1:${corePort}\n模式：真实 API（演示请用 pnpm dev:demo）`,
  );
  await run(process.execPath, ['--import', 'tsx', 'scripts/migrate.ts'], core);
  await run(process.execPath, ['--import', 'tsx', 'scripts/seed-admin.ts'], core);
  await run(process.execPath, ['--import', 'tsx', 'scripts/seed-permissions.ts'], core);
  void run(
    process.execPath,
    ['--watch', '--watch-preserve-output', '--import', 'tsx', 'src/index.ts'],
    core,
    true,
  ).catch((error) => {
    console.error(error.message);
    stop(1);
  });
  await waitForCore();
  await run(
    'pnpm',
    ['exec', 'vite', '--port', String(webPort), '--strictPort'],
    resolve(root, 'apps/web'),
    true,
  );
} catch (error) {
  console.error(error.message);
  stop(1);
}
