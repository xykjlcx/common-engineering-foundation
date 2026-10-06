import { defineConfig } from 'drizzle-kit';

// 只用于 `pnpm db:generate` 离线产出 SQL 迁移文件；运行迁移走 kernel/db.ts 的 migrate()。
// strict 迁移纪律：禁 drizzle-kit push（守卫 sql-snapshot 对 schema↔migrations 漂移设卡）。
export default defineConfig({
  dialect: 'postgresql',
  // kernel 基础表 + 各模块业务表（模块表随纵切住 modules/<m>/schema.ts，此处只收聚合口）
  schema: ['./src/schema/index.ts', './src/modules/*/schema.ts'],
  out: './drizzle',
  strict: true,
});
