import { createCollection } from '@/mocks/db';
import type { DeptDto } from '@/modules/admin/depts/api';

// 组织树取自原型 DeptTree.dc.html（集团 · 傲翼供应链）：
//   傲翼供应链 248
//   ├ 财务部 38 ─ 总账组 12 / 资金组 8 / 应付组 9 / 应收组 9
//   ├ 运营中心 126 ─ 尾程组 41 / 客服组 35 / 仓配组 50
//   ├ 技术部 44
//   ├ 人事行政部 21
//   └ 市场部 19（板上灰显 = enabled:false）
// 树上的数字是「含下级」，由 handlers 按用户集合实时统计，不写死在种子里。
export const deptIds = {
  org: 'dept-org',
  fin: 'dept-fin',
  finGeneralLedger: 'dept-fin-gl',
  finTreasury: 'dept-fin-tr',
  finPayable: 'dept-fin-ap',
  finReceivable: 'dept-fin-ar',
  ops: 'dept-ops',
  opsLastMile: 'dept-ops-lastmile',
  opsService: 'dept-ops-service',
  opsWarehouse: 'dept-ops-warehouse',
  tech: 'dept-tech',
  hr: 'dept-hr',
  marketing: 'dept-marketing',
} as const;

/** 每个末端部门的直属人数（板上的树数字；父节点自身不挂人） */
export const deptDirectHeadcounts: Record<string, number> = {
  [deptIds.org]: 0,
  [deptIds.fin]: 0,
  [deptIds.finGeneralLedger]: 12,
  [deptIds.finTreasury]: 8,
  [deptIds.finPayable]: 9,
  [deptIds.finReceivable]: 9,
  [deptIds.ops]: 0,
  [deptIds.opsLastMile]: 41,
  [deptIds.opsService]: 35,
  [deptIds.opsWarehouse]: 50,
  [deptIds.tech]: 44,
  [deptIds.hr]: 21,
  [deptIds.marketing]: 19,
};

// 编制（headcount）板上只给了总账组的 12 / 15；其余按「直属人数 + 固定余量」造，余量写死保证确定性。
const headcountSlack: Record<string, number> = {
  [deptIds.finGeneralLedger]: 3, // 板：12 / 15
  [deptIds.finTreasury]: 2,
  [deptIds.finPayable]: 1,
  [deptIds.finReceivable]: 3,
  [deptIds.opsLastMile]: 4,
  [deptIds.opsService]: 5,
  [deptIds.opsWarehouse]: 6,
  [deptIds.tech]: 6,
  [deptIds.hr]: 2,
  [deptIds.marketing]: 1,
};

interface DeptSeedRow {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sort: number;
  enabled?: boolean;
  createdAt: string;
}

const deptSeedRows: DeptSeedRow[] = [
  { id: deptIds.org, code: 'D-0001', name: '傲翼供应链', parentId: null, sort: 1, createdAt: '2021-04-06' },
  {
    id: deptIds.fin,
    code: 'D-0100',
    name: '财务部',
    parentId: deptIds.org,
    sort: 1,
    createdAt: '2021-04-06',
  },
  // 板 DeptTree 详情头：总账组 · D-0104 · 创建时间 2024-01-08 · 编制占用 12 / 15
  {
    id: deptIds.finGeneralLedger,
    code: 'D-0104',
    name: '总账组',
    parentId: deptIds.fin,
    sort: 1,
    createdAt: '2024-01-08',
  },
  {
    id: deptIds.finTreasury,
    code: 'D-0105',
    name: '资金组',
    parentId: deptIds.fin,
    sort: 2,
    createdAt: '2024-01-08',
  },
  {
    id: deptIds.finPayable,
    code: 'D-0106',
    name: '应付组',
    parentId: deptIds.fin,
    sort: 3,
    createdAt: '2024-01-08',
  },
  {
    id: deptIds.finReceivable,
    code: 'D-0107',
    name: '应收组',
    parentId: deptIds.fin,
    sort: 4,
    createdAt: '2024-01-08',
  },
  {
    id: deptIds.ops,
    code: 'D-0200',
    name: '运营中心',
    parentId: deptIds.org,
    sort: 2,
    createdAt: '2021-04-06',
  },
  {
    id: deptIds.opsLastMile,
    code: 'D-0201',
    name: '尾程组',
    parentId: deptIds.ops,
    sort: 1,
    createdAt: '2022-03-15',
  },
  {
    id: deptIds.opsService,
    code: 'D-0202',
    name: '客服组',
    parentId: deptIds.ops,
    sort: 2,
    createdAt: '2022-03-15',
  },
  {
    id: deptIds.opsWarehouse,
    code: 'D-0203',
    name: '仓配组',
    parentId: deptIds.ops,
    sort: 3,
    createdAt: '2022-03-15',
  },
  {
    id: deptIds.tech,
    code: 'D-0300',
    name: '技术部',
    parentId: deptIds.org,
    sort: 3,
    createdAt: '2021-06-01',
  },
  {
    id: deptIds.hr,
    code: 'D-0400',
    name: '人事行政部',
    parentId: deptIds.org,
    sort: 4,
    createdAt: '2021-04-06',
  },
  // 板上「市场部」整行灰显 → 停用部门
  {
    id: deptIds.marketing,
    code: 'D-0500',
    name: '市场部',
    parentId: deptIds.org,
    sort: 5,
    enabled: false,
    createdAt: '2023-02-20',
  },
];

/** 部门负责人：板 DeptTree 详情「负责人 林小雨」（总账组）；其余按各部门具名成员指定 */
export const deptLeaderEmployeeNo: Record<string, string> = {
  [deptIds.finGeneralLedger]: 'EMP-0231', // 林小雨（板）
  [deptIds.finTreasury]: 'EMP-0198', // 陈晓峰
  [deptIds.finPayable]: 'EMP-0243', // 何静
  [deptIds.finReceivable]: 'EMP-0208', // 邓玉洁
  [deptIds.opsLastMile]: 'EMP-0102', // 郑立航
  [deptIds.opsWarehouse]: 'EMP-0087', // 蒋鹏
  [deptIds.tech]: 'EMP-0075', // 黄仕杰
  [deptIds.hr]: 'EMP-0311', // 李蔓
};

const deptSeed: DeptDto[] = deptSeedRows.map((row) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  parentId: row.parentId,
  leaderId: null, // 由 users 种子回填（见 users/mocks/db.ts 的 applyDeptLeaders）
  enabled: row.enabled ?? true,
  sort: row.sort,
  headcount: (deptDirectHeadcounts[row.id] ?? 0) + (headcountSlack[row.id] ?? 0),
  memberCount: 0, // 运行时统计，见 ../__tests__/fixtures/dept.handlers.ts
  memberCountWithSub: 0,
  createdAt: row.createdAt,
}));

export const depts = createCollection<DeptDto, 'id'>(deptSeed, 'id');

/** rootId 自身 + 全部子孙 id（mock 内部用，和 model.collectDeptSubtreeIds 同语义） */
export function collectDeptIds(rootId: string) {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dept of depts.all()) {
      if (dept.parentId && ids.has(dept.parentId) && !ids.has(dept.id)) {
        ids.add(dept.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function deptNameChain(deptId: string): string[] {
  const byId = new Map(depts.all().map((dept) => [dept.id, dept]));
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(deptId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}
