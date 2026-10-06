import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [
      js.configs.recommended,
      // 类型感知规则（非 -recommended）：没有类型信息就抓不到 floating promise、
      // any 泄漏、误用 async 回调这几类真错——它们恰好是 TS 编译器不管、运行时才炸的那批。
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // projectService 让 typescript-eslint 自己按文件找所属 tsconfig，
      // 不必手工维护 project 数组（scripts/ 与 src/ 分属两个 tsconfig）。
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: '禁止硬编码色值，使用语义 token（bg/surface/text/pri…）',
        },
        {
          selector: 'Literal[value=/rounded-\\[/]',
          message: '禁止任意圆角值，使用 rounded-sm/md/lg/xl（乘法 token）',
        },
        {
          selector: 'Literal[value=/shadow-\\[/]',
          message: '禁止任意阴影值，使用 shadow-popover/modal/drawer/tooltip/card/lift 等语义 token',
        },
      ],
    },
  },
  {
    // 真后端 rpc 客户端的 demo 替身：它们的 async 是有语义的，不是漏写 await。
    // 契约（Pick<typeof rpc.x, …>）要求每个方法返回 Promise，而这些实现靠 BizError 同步 throw 表达
    // 「版本冲突 / 不存在」——只有 async 才把它转成 rejection。改成同步函数 + Promise.resolve 会让
    // 异常在调用点当场抛出，`expect(demoUser.update(...)).rejects` 与任何 `.catch()` 消费方立刻失效。
    // 所以这里关掉 require-await，而不是把 async 拆掉。
    files: ['src/**/mocks/demo-*.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    // 构建/生成脚本跑在 Node 里，不是浏览器：给 node globals，并关掉只对 React 组件有意义的两条规则。
    files: ['scripts/**/*.{ts,mts}', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // .mjs 脚本没有类型信息，只吃 js recommended；不进类型感知那一档，否则 projectService 直接解析失败。
    files: ['**/*.{mjs,js}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
  {
    // 文件式路由约定：路由文件导出 Route（createFileRoute 结果）+ 一个仅供 component 使用的本地页面组件。
    // react-refresh 启发式对这种"定义组件却只导出 Route"的形态误报，而 TanStack Router 自带路由级 HMR，
    // 故对 routes/ 关闭该规则（其余目录仍全量守护）。
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // shadcn 生成的 UI 基元（button 导出 buttonVariants、sheet 导出 SheetContent 等）：
    // 组件 + variants/常量同文件导出是官方约定，且这些文件不手改，豁免 react-refresh 单导出约束。
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
