import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { format as formatSource, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const clientFile = path.join(root, 'client', 'index.d.ts');

export async function generateClient() {
  const configPath = path.join(root, 'tsconfig.build.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root, { noEmit: true }, configPath);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(
    diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    [],
    '生成客户端前必须修复服务端类型错误',
  );
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(path.join(root, 'src/router.ts'));
  assert.ok(source);
  const alias = source.statements.find(
    (node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'AppRouterClient',
  );
  assert.ok(alias && ts.isTypeAliasDeclaration(alias));
  const format = (type) =>
    checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias);
  function render(type, depth) {
    const signatures = type.getCallSignatures();
    if (signatures.length > 0) {
      // oRPC Client 的公开签名使用 rest tuple 与 ClientPromiseResult；保留选项、可选入参及错误类型。
      assert.equal(signatures.length, 1, '客户端重载需要显式支持');
      const signature = signatures[0];
      assert.equal(signature.parameters.length, 1, 'oRPC客户端参数形态变化，请核对锁定版本');
      const rest = checker.getTypeOfSymbolAtLocation(signature.parameters[0], source);
      const result = checker.getReturnTypeOfSignature(signature);
      assert.equal(result.aliasSymbol?.name, 'ClientPromiseResult');
      assert.equal(result.aliasTypeArguments?.length, 2);
      const [output, error] = result.aliasTypeArguments;
      return `(...rest: ${format(rest)}) => ClientPromiseResult<${format(output)}, ${format(error)}>`;
    }
    const indent = '  '.repeat(depth);
    const properties = checker.getPropertiesOfType(type);
    assert.ok(properties.length > 0, '客户端路由节点不能为空');
    return `{\n${properties.map((property) => `${indent}  ${JSON.stringify(property.name)}: ${render(checker.getTypeOfSymbolAtLocation(property, source), depth + 1)};`).join('\n')}\n${indent}}`;
  }
  const body = `export type AppRouterClient = ${render(checker.getTypeFromTypeNode(alias.type), 0)};`;
  const helpers = new Map();
  const imported = new Set(['ClientPromiseResult', 'FriendlyClientOptions', 'ORPCError']);
  const typeDefinitions = program
    .getSourceFiles()
    .filter((file) => file.fileName.startsWith(path.join(root, 'src')))
    .flatMap((file) =>
      file.statements.filter((node) => ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)),
    );
  function collectHelpers(text) {
    const ast = ts.createSourceFile('client.ts', text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        const name = node.typeName.text;
        if (
          name !== 'AppRouterClient' &&
          !imported.has(name) &&
          !helpers.has(name) &&
          !checker.resolveName(name, undefined, ts.SymbolFlags.Type, false)
        ) {
          const matches = typeDefinitions.filter((definition) => definition.name.text === name);
          assert.equal(matches.length, 1, `无法唯一展开客户端类型 ${name}`);
          const definition = matches[0];
          assert.equal(definition.typeParameters?.length ?? 0, 0, `客户端泛型别名 ${name} 需要显式展开`);
          const definitionType = checker.getTypeAtLocation(definition);
          let rendered = format(definitionType);
          if (ts.isInterfaceDeclaration(definition)) {
            assert.equal(definitionType.getCallSignatures().length, 0, '客户端递归接口必须是数据结构');
            assert.equal(
              checker.getIndexInfosOfType(definitionType).length,
              0,
              '客户端递归索引接口需要显式支持',
            );
            rendered = `{ ${checker
              .getPropertiesOfType(definitionType)
              .map((property) => {
                const readonly = property.declarations?.some(
                  (declaration) =>
                    (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Readonly) !== 0,
                );
                const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
                return `${readonly ? 'readonly ' : ''}${JSON.stringify(property.name)}${optional ? '?' : ''}: ${format(checker.getTypeOfSymbolAtLocation(property, definition))};`;
              })
              .join(' ')} }`;
          }
          const declaration = `type ${name} = ${rendered};`;
          helpers.set(name, declaration);
          collectHelpers(declaration);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  collectHelpers(body);
  const content = `// Generated by pnpm --filter @keel/core client:generate. Do not edit.\nimport type { ClientPromiseResult, FriendlyClientOptions, ORPCError } from '@orpc/client';\n\n${[...helpers.values()].join('\n')}\n${body}\n`;
  return formatSource(content, { ...(await resolveConfig(clientFile)), parser: 'typescript' });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = await generateClient();
  if (process.argv.includes('--check')) {
    assert.equal(
      readFileSync(clientFile, 'utf8'),
      content,
      '客户端声明漂移：运行 pnpm --filter @keel/core client:generate',
    );
  } else {
    mkdirSync(path.dirname(clientFile), { recursive: true });
    writeFileSync(clientFile, content);
  }
}
