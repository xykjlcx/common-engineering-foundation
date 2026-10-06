import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.resolve(root, '../web');
function optionsOf(configPath) {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  assert.deepEqual(parsed.errors, []);
  return { ...parsed.options, configFilePath: configPath };
}
function compile(source, options, directory = root, overrides = new Map()) {
  const filename = path.join(directory, 'type-tests', 'consumer.ts');
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    file === filename
      ? ts.createSourceFile(file, source, languageVersion, true)
      : overrides.has(file)
        ? ts.createSourceFile(file, overrides.get(file), languageVersion, true)
        : originalGetSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram(
    [filename],
    { ...options, noEmit: true, incremental: false, tsBuildInfoFile: undefined },
    host,
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  return { program, diagnostics };
}
const browser = optionsOf(path.join(web, 'tsconfig.app.json'));
const node = optionsOf(path.join(web, 'tsconfig.node.json'));
const consumer = `
  import type { AppRouterClient } from '@keel/core/client';
  import { CreateUserSchema } from '@keel/core/user-contract';
  import type { input } from 'zod';
  declare const rpc: AppRouterClient;
  const result = await rpc.user.list({ page: 1, pageSize: 20 });
  const names: string[] = result.list.map(user => user.name);
  const user: input<typeof CreateUserSchema> = { name: names[0] ?? 'Reader', username: 'reader', password: 'valid-password' };
  CreateUserSchema.parse(user);
`;
const positive = compile(consumer, browser);
const declarationSource = compile(readFileSync(path.join(root, 'client/index.d.ts'), 'utf8'), browser);
assert.deepEqual(
  declarationSource.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  [],
  '生成声明按.ts复核，不能被skipLibCheck隐藏错误',
);
assert.deepEqual(
  positive.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  [],
  '公开browser consumer必须独立通过',
);
const serverSources = positive.program
  .getSourceFiles()
  .map((f) => f.fileName)
  .filter(
    (f) => f.startsWith(path.join(root, 'src')) && !f.endsWith('-contract.ts') && !f.endsWith('/contract.ts'),
  );
assert.deepEqual(serverSources, [], '浏览器consumer不得遍历core实现源码');
assert.equal(
  positive.program
    .getSourceFiles()
    .some((file) => /[/\\]@orpc[/\\]server[/\\]|[/\\]drizzle-orm[/\\]/.test(file.fileName)),
  false,
  'browser不得引入服务端库声明',
);
for (const [name, source, options, directory, codes] of [
  ['browser Node globals', `${consumer}\nprocess.cwd(); Buffer.from('x');`, browser, root, [2591]],
  ['Node DOM globals', 'export {}; document.title = window.location.href;', node, web, [2584, 2304]],
  [
    'browser server export',
    "import { coreDb } from '@keel/core/kernel/db'; coreDb();",
    browser,
    root,
    [2307],
  ],
  ['incompatible contract', `${consumer}\nawait rpc.user.list({ page: 'invalid' });`, browser, root, [2322]],
]) {
  const result = compile(source, options, directory);
  for (const code of codes)
    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.code === code),
      `${name}必须被编译器以 ${code} 拒绝，实际: ${result.diagnostics.map((d) => d.code)}`,
    );
  console.log(`${name}: rejected`);
}
console.log(`browser consumer: passed; core implementation sources: ${serverSources.length}`);

const equivalence = compile(
  `
  import type { AppRouterClient as Generated } from '@keel/core/client';
  import type { AppRouterClient as Source } from '@keel/core/router';
  type Assert<T extends true> = T;
  export type GeneratedMatchesSource = Assert<Generated extends Source ? true : false>;
  export type SourceMatchesGenerated = Assert<Source extends Generated ? true : false>;
`,
  optionsOf(path.join(root, 'tsconfig.json')),
);
assert.deepEqual(
  equivalence.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  [],
  '客户端生成声明必须与服务端推导类型双向兼容',
);
console.log('generated/source types: equivalent');

const changedContract = compile(
  consumer,
  browser,
  root,
  new Map([
    [
      path.join(root, 'src/modules/user/contract.ts'),
      `import * as z from 'zod';
   export const CreateUserSchema = z.object({ name: z.string(), username: z.number(), password: z.string() });`,
    ],
  ]),
);
assert.ok(
  changedContract.diagnostics.some((diagnostic) => diagnostic.code === 2322),
  '公开契约将username改为number必须令现有消费者类型失败',
);
console.log('changed public contract: consumer rejected');
