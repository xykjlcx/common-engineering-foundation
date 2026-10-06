import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import {
  parseWiringDocument,
  resolveWiring,
  type WiringDocument,
  type WiringItem,
} from '@keel/core/permission-wiring';

export {
  moduleKeyFromRouteId,
  parseWiringDocument,
  resolveWiring,
  type WiringDocument,
  type WiringItem,
  type WiringKind,
} from '@keel/core/permission-wiring';

export async function discoverBusinessModules(modulesRoot: string): Promise<string[]> {
  const subsystems = await readdir(modulesRoot, { withFileTypes: true });
  const keys: string[] = [];
  for (const subsystem of subsystems) {
    if (!subsystem.isDirectory()) continue;
    const children = await readdir(join(modulesRoot, subsystem.name), { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const entries = await readdir(join(modulesRoot, subsystem.name, child.name));
      if (entries.includes('index.tsx')) keys.push(`${subsystem.name}/${child.name}`);
    }
  }
  return keys.sort();
}

export function assertWiringCoverage(modules: readonly string[], items: readonly WiringItem[]): void {
  for (const moduleKey of modules) resolveWiring(moduleKey, items);
  for (const item of items) {
    if (item.key.includes('/')) {
      if (!modules.includes(item.key)) throw new Error(`悬空登记: ${item.key}`);
      continue;
    }
    const children = modules.filter((moduleKey) => moduleKey.startsWith(`${item.key}/`));
    if (children.length === 0) throw new Error(`悬空登记: ${item.key}`);
  }
}

function mentionsHttpClient(source: string, fileName: string): boolean {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      (node.moduleSpecifier.text.includes('/http/client') || node.moduleSpecifier.text.endsWith('/http'))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function mentionsRpc(source: string, fileName: string): boolean {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'rpc'
    ) {
      found = true;
      return;
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      (node.moduleSpecifier.text.includes('/rpc/') ||
        node.moduleSpecifier.text.endsWith('/rpc') ||
        node.moduleSpecifier.text.endsWith('/rpc/client'))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return filesUnder(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
    }),
  );
  return nested.flat();
}

function directRpcRouters(source: string, fileName: string, clientFile: string): Set<string> {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const imports = file.statements.filter(ts.isImportDeclaration).filter((statement) => {
    if (!ts.isStringLiteral(statement.moduleSpecifier) || statement.importClause?.isTypeOnly) return false;
    const specifier = statement.moduleSpecifier.text;
    return (
      specifier === '@/lib/rpc/client' ||
      (specifier.startsWith('.') &&
        resolve(dirname(fileName), specifier).replace(/\.(?:ts|js)$/, '') === clientFile)
    );
  });
  const routers = new Set<string>();
  if (imports.length === 0) return routers;
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === fileName ? file : undefined);
  const checker = ts.createProgram([fileName], options, host).getTypeChecker();
  const clients = new Set<ts.Symbol>();
  const namespaces = new Set<ts.Symbol>();
  for (const statement of imports) {
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      const symbol = checker.getSymbolAtLocation(bindings.name);
      if (symbol) namespaces.add(symbol);
    } else {
      for (const binding of bindings.elements) {
        if (binding.isTypeOnly || (binding.propertyName?.text ?? binding.name.text) !== 'rpc') continue;
        const symbol = checker.getSymbolAtLocation(binding.name);
        if (symbol) clients.add(symbol);
      }
    }
  }
  function rpcPath(node: ts.Expression, seen = new Set<ts.Symbol>()): string[] | undefined {
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return rpcPath(node.expression, seen);
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (!symbol || seen.has(symbol)) return undefined;
      if (clients.has(symbol)) return [];
      seen.add(symbol);
      const declaration = symbol.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer)
        return rpcPath(declaration.initializer, seen);
      if (declaration && ts.isBindingElement(declaration) && ts.isObjectBindingPattern(declaration.parent)) {
        const owner = declaration.parent.parent;
        const key = declaration.propertyName ?? declaration.name;
        if (
          ts.isVariableDeclaration(owner) &&
          owner.initializer &&
          (ts.isIdentifier(key) || ts.isStringLiteralLike(key))
        ) {
          const parent = rpcPath(owner.initializer, seen);
          if (parent) return [...parent, key.text];
        }
      }
      return undefined;
    }
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return undefined;
    const key = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression;
    if (ts.isIdentifier(node.expression)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      if (
        symbol &&
        namespaces.has(symbol) &&
        ((ts.isPropertyAccessExpression(node) && key.getText(file) === 'rpc') ||
          (ts.isStringLiteralLike(key) && key.text === 'rpc'))
      )
        return [];
    }
    const parent = rpcPath(node.expression, seen);
    if (!parent) return undefined;
    if (ts.isPropertyAccessExpression(node)) return [...parent, node.name.text];
    if (ts.isStringLiteralLike(key)) return [...parent, key.text];
    if (parent.length > 0) return parent;
    throw new Error(
      `无法静态判定 RPC router: ${fileName}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`,
    );
  }
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) return;
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const router = rpcPath(node)?.[0];
      if (router) routers.add(router);
    }
    if (ts.isBindingElement(node) && ts.isIdentifier(node.name)) {
      const router = rpcPath(node.name)?.[0];
      if (router) routers.add(router);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return routers;
}

async function assertLiveRpcRoutersDeclared(
  modulesRoot: string,
  modules: readonly string[],
  items: readonly WiringItem[],
): Promise<void> {
  const clientFile = resolve(modulesRoot, '../lib/rpc/client');
  for (const moduleKey of modules) {
    const wiring = resolveWiring(moduleKey, items);
    if (wiring.kind !== 'live') continue;
    const files = (await filesUnder(join(modulesRoot, moduleKey))).filter(
      (file) => !file.includes('/__tests__/') && !file.includes('/mocks/') && !file.includes('.spec.'),
    );
    for (const file of files) {
      for (const router of directRpcRouters(await readFile(file, 'utf8'), file, clientFile)) {
        if (!wiring.routers.includes(router))
          throw new Error(`接通模块 ${moduleKey} 未登记 RPC router ${router}: ${file}`);
      }
    }
  }
}

export async function assertLiveModulesHaveNoHttp(
  modulesRoot: string,
  modules: readonly string[],
  items: readonly WiringItem[],
): Promise<void> {
  const liveDirs = new Set<string>();
  for (const moduleKey of modules) {
    const wiring = resolveWiring(moduleKey, items);
    if (wiring.kind !== 'live') continue;
    liveDirs.add(join(modulesRoot, moduleKey, 'api'));
  }
  for (const directory of [...liveDirs].sort()) {
    const files = await filesUnder(directory).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
      throw error;
    });
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (mentionsHttpClient(source, file)) throw new Error(`接通模块 api 出现 http client: ${file}`);
    }
  }
}

export async function assertDemoModulesHaveNoRpc(
  modulesRoot: string,
  modules: readonly string[],
  items: readonly WiringItem[],
): Promise<void> {
  const demoDirs = new Set<string>();
  for (const moduleKey of modules) {
    const wiring = resolveWiring(moduleKey, items);
    if (wiring.kind !== 'demo') continue;
    demoDirs.add(join(modulesRoot, moduleKey, 'api'));
  }
  for (const directory of [...demoDirs].sort()) {
    const files = await filesUnder(directory).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
      throw error;
    });
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (mentionsRpc(source, file)) throw new Error(`演示模块出现 rpc 调用: ${file}`);
    }
  }
}

export async function loadAndValidateWiring(args: {
  wiringInput: unknown;
  modulesRoot: string;
}): Promise<{ wiring: WiringDocument; modules: string[] }> {
  const wiring = parseWiringDocument(args.wiringInput);
  const modules = await discoverBusinessModules(args.modulesRoot);
  assertWiringCoverage(modules, wiring.items);
  await assertDemoModulesHaveNoRpc(args.modulesRoot, modules, wiring.items);
  await assertLiveModulesHaveNoHttp(args.modulesRoot, modules, wiring.items);
  await assertLiveRpcRoutersDeclared(args.modulesRoot, modules, wiring.items);
  return { wiring, modules };
}
