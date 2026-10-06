import { createCollection } from '@/mocks/db';
import { deptDirectHeadcounts, deptIds, deptLeaderEmployeeNo } from '@/modules/admin/depts/mocks/db';
import type { PermissionChangeDto, RoleGrantDto, UserDetailDto, UserDto } from '@/modules/admin/users/api';

// 「傲翼供应链」同一套账：248 人 = 在职 231 + 试用 9 + 离职 8，其中已禁用 5（在职的横切子集）。

// 其余 225 人由固定规则生成（无随机数），保证每次启动数据完全一致。

/** 角色 id 与 roles 包种子一一对应（见 modules/admin/roles/__tests__/fixtures/role.handlers.ts 的 roleSeed 板追加段） */
export const roleIds = {
  superadmin: 'superadmin',
  sysops: 'sysops',
  auditor: 'auditor',
  readonly: 'readonly-visitor',
  deptAdmin: 'dept-admin',
  finPreparer: 'fin-preparer',
  finAuditor: 'fin-auditor',
  cashier: 'cashier',
  reconciler: 'reconciler',
  labelOperator: 'label-operator',
  channelAdmin: 'channel-admin',
  warehouseOperator: 'warehouse-operator',
  csAgent: 'cs-agent',
  hrSpecialist: 'hr-specialist',
} as const;

export const boardRoleUserCounts: Record<string, number> = {
  [roleIds.superadmin]: 2,
  [roleIds.sysops]: 3,
  [roleIds.auditor]: 2,
  [roleIds.readonly]: 18,
  [roleIds.deptAdmin]: 23,
  [roleIds.finPreparer]: 26,
  [roleIds.finAuditor]: 12,
  [roleIds.cashier]: 6,
  [roleIds.reconciler]: 0,
  [roleIds.labelOperator]: 34,
  [roleIds.channelAdmin]: 5,
  [roleIds.warehouseOperator]: 28,
  [roleIds.csAgent]: 31,
  [roleIds.hrSpecialist]: 4,
};

const EMAIL_DOMAIN = 'aoyi-scm.com';
const WORK_LOCATIONS: Record<string, string> = {
  [deptIds.finGeneralLedger]: '深圳总部',
  [deptIds.finTreasury]: '深圳总部',
  [deptIds.finPayable]: '深圳总部',
  [deptIds.finReceivable]: '深圳总部',
  [deptIds.opsLastMile]: '深圳龙华仓',
  [deptIds.opsService]: '深圳总部',
  [deptIds.opsWarehouse]: '东莞清溪仓',
  [deptIds.tech]: '深圳总部',
  [deptIds.hr]: '深圳总部',
  [deptIds.marketing]: '广州分部',
};

type LastLoginSeed =
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'daysAgo'; days: number; time: string }
  | { kind: 'never' };

function isoAt(daysAgo: number, time: string) {
  const [hh = '09', mm = '00'] = time.split(':');
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Number(hh), Number(mm), 0, 0);
  return date.toISOString();
}

function resolveLastLogin(seed: LastLoginSeed): string | null {
  if (seed.kind === 'never') return null;
  if (seed.kind === 'today') return isoAt(0, seed.time);
  if (seed.kind === 'yesterday') return isoAt(1, seed.time);
  return isoAt(seed.days, seed.time);
}

interface NamedSeed {
  name: string;
  account: string;
  email?: string;
  employeeNo: string;
  deptId: string;
  postName: string;
  roles: string[];
  /** 手机三段：前缀 3 位 + 中间 4 位 + 尾号 4 位；脱敏只显示前 3 位和尾号 4 位 */
  phone: [string, string, string];
  gender: 'male' | 'female';
  status: 'active' | 'probation' | 'left';
  enabled?: boolean;
  joinedAt: string;
  lastLogin: LastLoginSeed;
  managerNo?: string;
  employmentType?: 'fulltime' | 'parttime' | 'intern' | 'outsourced';
  dataScope?: 'self' | 'dept' | 'deptAndSub' | 'all' | 'custom';
}

const boardListSeeds: NamedSeed[] = [
  {
    name: '林小雨',
    account: 'linxiaoyu',
    email: `linxy@${EMAIL_DOMAIN}`,
    employeeNo: 'EMP-0231',
    deptId: deptIds.finGeneralLedger,
    postName: '会计主管',
    roles: [roleIds.finPreparer, roleIds.finAuditor],
    phone: ['138', '5120', '3377'],
    gender: 'female',
    status: 'active',
    joinedAt: '2024-03-11',
    lastLogin: { kind: 'today', time: '09:14' },
    managerNo: 'EMP-0198',
    dataScope: 'deptAndSub',
  },
  {
    name: '陈晓峰',
    account: 'chenxiaofeng',
    employeeNo: 'EMP-0198',
    deptId: deptIds.finTreasury,
    postName: '出纳',
    roles: [roleIds.cashier],
    phone: ['139', '2077', '4185'],
    gender: 'male',
    status: 'active',
    joinedAt: '2022-05-09',
    lastLogin: { kind: 'today', time: '08:52' },
    dataScope: 'deptAndSub',
  },
  {
    name: '周敏',
    account: 'zhoumin',
    employeeNo: 'EMP-0264',
    deptId: deptIds.finGeneralLedger,
    postName: '会计',
    roles: [roleIds.finPreparer],
    phone: ['137', '6631', '2049'],
    gender: 'female',
    status: 'active',
    joinedAt: '2024-09-02',
    lastLogin: { kind: 'yesterday', time: '18:30' },
    managerNo: 'EMP-0231',
  },
  {
    name: '郑立航',
    account: 'zhenglihang',
    employeeNo: 'EMP-0102',
    deptId: deptIds.opsLastMile,
    postName: '运营主管',
    roles: [roleIds.labelOperator, roleIds.channelAdmin],
    phone: ['135', '8842', '6017'],
    gender: 'male',
    status: 'active',
    joinedAt: '2022-03-21',
    lastLogin: { kind: 'today', time: '10:05' },
    dataScope: 'deptAndSub',
  },
  {
    name: '吴桐',
    account: 'wutong',
    employeeNo: 'EMP-0287',
    deptId: deptIds.opsService,
    postName: '客服专员',
    roles: [roleIds.csAgent],
    phone: ['136', '4419', '7286'],
    gender: 'female',
    status: 'probation',
    joinedAt: '2026-06-15',
    lastLogin: { kind: 'daysAgo', days: 3, time: '16:20' },
  },
  {
    name: '黄仕杰',
    account: 'huangshijie',
    employeeNo: 'EMP-0075',
    deptId: deptIds.tech,
    postName: '系统管理员',
    roles: [roleIds.superadmin],
    phone: ['133', '0016', '5934'],
    gender: 'male',
    status: 'active',
    joinedAt: '2021-06-01',
    lastLogin: { kind: 'today', time: '11:22' },
    dataScope: 'all',
  },
  {
    name: '李蔓',
    account: 'liman',
    employeeNo: 'EMP-0311',
    deptId: deptIds.hr,
    postName: 'HRBP',
    roles: [roleIds.hrSpecialist],
    phone: ['188', '7503', '2168'],
    gender: 'female',
    status: 'active',
    joinedAt: '2025-02-17',
    lastLogin: { kind: 'today', time: '09:41' },
    dataScope: 'all',
  },
  {
    name: '何静',
    account: 'hejing',
    employeeNo: 'EMP-0243',
    deptId: deptIds.finPayable,
    postName: '会计',
    roles: [roleIds.finPreparer],
    phone: ['158', '9024', '3751'],
    gender: 'female',
    status: 'active',
    joinedAt: '2025-01-16',
    lastLogin: { kind: 'yesterday', time: '17:12' },
  },
  {
    name: '罗文博',
    account: 'luowenbo',
    employeeNo: 'EMP-0166',
    deptId: deptIds.opsLastMile,
    postName: '打单员',
    roles: [roleIds.labelOperator],
    phone: ['176', '5570', '4092'],
    gender: 'male',
    status: 'active',
    joinedAt: '2023-08-07',
    lastLogin: { kind: 'today', time: '10:48' },
    managerNo: 'EMP-0102',
  },
  {
    name: '邓玉洁',
    account: 'dengyujie',
    employeeNo: 'EMP-0208',
    deptId: deptIds.finReceivable,
    postName: '会计',
    roles: [roleIds.finPreparer, roleIds.finAuditor],
    phone: ['131', '4470', '8265'],
    gender: 'female',
    status: 'active',
    joinedAt: '2024-06-24',
    lastLogin: { kind: 'today', time: '09:58' },
  },
  {
    name: '蒋鹏',
    account: 'jiangpeng',
    employeeNo: 'EMP-0087',
    deptId: deptIds.opsWarehouse,
    postName: '仓储主管',
    roles: [roleIds.warehouseOperator, roleIds.deptAdmin],
    phone: ['189', '6612', '3408'],
    gender: 'male',
    status: 'active',
    joinedAt: '2021-11-29',
    lastLogin: { kind: 'today', time: '10:31' },
    dataScope: 'deptAndSub',
  },
  {
    name: '高伟',
    account: 'gaowei',
    employeeNo: 'EMP-0143',
    deptId: deptIds.tech,
    postName: '开发工程师',
    roles: [roleIds.readonly],
    phone: ['186', '9917', '5273'],
    gender: 'male',
    status: 'active',
    joinedAt: '2023-04-10',
    lastLogin: { kind: 'yesterday', time: '20:05' },
  },
  {
    name: '徐佳宁',
    account: 'xujianing',
    employeeNo: 'EMP-0295',
    deptId: deptIds.opsService,
    postName: '客服专员',
    roles: [roleIds.csAgent],
    phone: ['155', '2264', '6819'],
    gender: 'female',
    status: 'probation',
    joinedAt: '2026-07-06',
    lastLogin: { kind: 'daysAgo', days: 5, time: '14:03' },
  },

  {
    name: '孙远',
    account: 'sunyuan',
    employeeNo: 'EMP-0059',
    deptId: deptIds.opsWarehouse,
    postName: '仓管',
    roles: [roleIds.warehouseOperator],
    phone: ['159', '3388', '4726'],
    gender: 'male',
    status: 'active',
    enabled: false,
    joinedAt: '2021-09-13',
    lastLogin: { kind: 'daysAgo', days: 21, time: '09:26' },
  },
  {
    name: '秦芳',
    account: 'qinfang',
    employeeNo: 'EMP-0322',
    deptId: deptIds.hr,
    postName: '行政专员',
    roles: [roleIds.readonly],
    phone: ['152', '8805', '1937'],
    gender: 'female',
    status: 'left',
    joinedAt: '2025-05-19',
    lastLogin: { kind: 'daysAgo', days: 36, time: '16:40' },
  },
];

const boardDeptSeeds: NamedSeed[] = [
  {
    name: '王倩',
    account: 'wangqian',
    employeeNo: 'EMP-0276',
    deptId: deptIds.finGeneralLedger,
    postName: '会计助理',
    roles: [roleIds.finPreparer],
    phone: ['137', '2841', '5063'],
    gender: 'female',
    status: 'active',
    joinedAt: '2025-04-08',
    lastLogin: { kind: 'yesterday', time: '09:12' },
    managerNo: 'EMP-0231',
  },
  {
    name: '崔浩',
    account: 'cuihao',
    employeeNo: 'EMP-0301',
    deptId: deptIds.finGeneralLedger,
    postName: '会计助理',
    roles: [roleIds.readonly],
    phone: ['150', '3372', '9184'],
    gender: 'male',
    status: 'probation',
    joinedAt: '2025-08-19',
    lastLogin: { kind: 'daysAgo', days: 2, time: '15:47' },
    managerNo: 'EMP-0231',
  },
  {
    name: '冯磊',
    account: 'fenglei',
    employeeNo: 'EMP-0219',
    deptId: deptIds.finGeneralLedger,
    postName: '税务会计',
    roles: [roleIds.finPreparer],
    phone: ['132', '7714', '2650'],
    gender: 'male',
    status: 'active',
    joinedAt: '2024-07-15',
    lastLogin: { kind: 'today', time: '08:37' },
    managerNo: 'EMP-0231',
  },
  {
    name: '石岩',
    account: 'shiyan',
    employeeNo: 'EMP-0288',
    deptId: deptIds.finGeneralLedger,
    postName: '成本会计',
    roles: [roleIds.finPreparer],
    phone: ['180', '6209', '3341'],
    gender: 'male',
    status: 'active',
    joinedAt: '2025-03-27',
    lastLogin: { kind: 'yesterday', time: '19:22' },
    managerNo: 'EMP-0231',
  },
  {
    name: '汤伟',
    account: 'tangwei',
    employeeNo: 'EMP-0251',
    deptId: deptIds.finGeneralLedger,
    postName: '应付会计',
    roles: [roleIds.finPreparer],
    phone: ['185', '4438', '7702'],
    gender: 'male',
    status: 'active',
    joinedAt: '2024-11-05',
    lastLogin: { kind: 'today', time: '09:05' },
    managerNo: 'EMP-0231',
  },
  {
    name: '卢晓晴',
    account: 'luxiaoqing',
    employeeNo: 'EMP-0269',
    deptId: deptIds.finGeneralLedger,
    postName: '会计',
    roles: [roleIds.finPreparer],
    phone: ['177', '5591', '2836'],
    gender: 'female',
    status: 'active',
    joinedAt: '2025-02-20',
    lastLogin: { kind: 'daysAgo', days: 2, time: '11:18' },
    managerNo: 'EMP-0231',
  },
  {
    name: '戴宇',
    account: 'daiyu',
    employeeNo: 'EMP-0304',
    deptId: deptIds.finTreasury,
    postName: '出纳助理',
    roles: [roleIds.cashier],
    phone: ['134', '8863', '5017'],
    gender: 'male',
    status: 'probation',
    joinedAt: '2025-09-08',
    lastLogin: { kind: 'daysAgo', days: 4, time: '10:26' },
    managerNo: 'EMP-0198',
  },
  {
    name: '邱雪',
    account: 'qiuxue',
    employeeNo: 'EMP-0333',
    deptId: deptIds.finGeneralLedger,
    postName: '会计助理',
    roles: [roleIds.readonly],
    phone: ['153', '9026', '4478'],
    gender: 'female',
    status: 'probation',
    joinedAt: '2026-01-12',
    lastLogin: { kind: 'daysAgo', days: 6, time: '17:31' },
    managerNo: 'EMP-0231',
  },
];

const namedSeeds = [...boardListSeeds, ...boardDeptSeeds];

const SURNAMES = [
  '王',
  '李',
  '张',
  '刘',
  '陈',
  '杨',
  '赵',
  '黄',
  '周',
  '吴',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '何',
  '高',
  '林',
  '罗',
  '郑',
  '梁',
  '谢',
  '宋',
  '唐',
  '许',
  '韩',
  '冯',
  '邓',
  '曹',
];
const SURNAME_PY = [
  'wang',
  'li',
  'zhang',
  'liu',
  'chen',
  'yang',
  'zhao',
  'huang',
  'zhou',
  'wu',
  'xu',
  'sun',
  'ma',
  'zhu',
  'hu',
  'guo',
  'he',
  'gao',
  'lin',
  'luo',
  'zheng',
  'liang',
  'xie',
  'song',
  'tang',
  'xuu',
  'han',
  'feng',
  'deng',
  'cao',
];
const GIVEN = [
  '嘉怡',
  '子轩',
  '雨薇',
  '浩然',
  '思远',
  '婉婷',
  '敏杰',
  '雅雯',
  '俊豪',
  '晓琳',
  '志强',
  '晓东',
  '佳慧',
  '天翔',
  '雨桐',
  '若琳',
  '一鸣',
  '梦瑶',
  '泽宇',
  '欣然',
  '博文',
  '慧敏',
  '立诚',
  '楚涵',
  '少康',
  '亦凡',
  '明轩',
  '静怡',
  '家豪',
  '玥彤',
  '书瑶',
  '沐辰',
  '知微',
  '云舟',
  '清越',
  '晚舟',
  '砚青',
];
const GIVEN_PY = [
  'jiayi',
  'zixuan',
  'yuwei',
  'haoran',
  'siyuan',
  'wanting',
  'minjie',
  'yawen',
  'junhao',
  'xiaolin',
  'zhiqiang',
  'xiaodong',
  'jiahui',
  'tianxiang',
  'yutong',
  'ruolin',
  'yiming',
  'mengyao',
  'zeyu',
  'xinran',
  'bowen',
  'huimin',
  'licheng',
  'chuhan',
  'shaokang',
  'yifan',
  'mingxuan',
  'jingyi',
  'jiahao',
  'yuetong',
  'shuyao',
  'muchen',
  'zhiwei',
  'yunzhou',
  'qingyue',
  'wanzhou',
  'yanqing',
];

const POSITIONS: Record<string, string[]> = {
  [deptIds.finGeneralLedger]: ['会计', '会计助理', '总账会计'],
  [deptIds.finTreasury]: ['出纳', '资金专员', '出纳助理'],
  [deptIds.finPayable]: ['应付会计', '费用会计', '会计助理'],
  [deptIds.finReceivable]: ['应收会计', '对账专员', '会计助理'],
  [deptIds.opsLastMile]: ['打单员', '尾程专员', '轨迹跟进'],
  [deptIds.opsService]: ['客服专员', '客服组长', '售后专员'],
  [deptIds.opsWarehouse]: ['仓管', '分拣员', '仓配调度'],
  [deptIds.tech]: ['开发工程师', '测试工程师', '运维工程师', '产品经理'],
  [deptIds.hr]: ['人事专员', '行政专员', '招聘专员'],
  [deptIds.marketing]: ['市场专员', '内容运营', '渠道拓展'],
};

/** 生成序号 → 用工状态；索引集合写死，让 248/231/9/8/5 这本账每次都对得上 */
const GENERATED_PROBATION = new Set([12, 47, 96, 173]);
const GENERATED_LEFT = new Set([5, 33, 68, 101, 140, 188, 214]);
const GENERATED_DISABLED = new Set([21, 74, 129, 200]);

const takenEmployeeNos = new Set(namedSeeds.map((seed) => seed.employeeNo));

function nextEmployeeNo(cursor: { value: number }) {
  for (;;) {
    cursor.value += 1;
    const no = `EMP-${String(cursor.value).padStart(4, '0')}`;
    if (!takenEmployeeNos.has(no)) {
      takenEmployeeNos.add(no);
      return no;
    }
  }
}

function joinedAtFor(index: number) {
  const year = 2021 + (index % 5);
  const month = (index * 7) % 12;
  const day = (index * 11) % 27;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
}

function lastLoginFor(index: number, status: 'active' | 'probation' | 'left'): LastLoginSeed {
  if (status === 'left') return { kind: 'daysAgo', days: 30 + (index % 45), time: '17:05' };
  const bucket = index % 9;
  const time = `${String(8 + (index % 11)).padStart(2, '0')}:${String((index * 13) % 60).padStart(2, '0')}`;
  if (bucket < 4) return { kind: 'today', time };
  if (bucket < 6) return { kind: 'yesterday', time };
  return { kind: 'daysAgo', days: bucket - 4, time };
}

interface PersonRow extends Omit<UserDto, 'version' | 'updatedAt' | 'systemAdmin'> {
  employeeNo: string;
  deptId: string;
  postName: string;
  joinedAt: string;
  status: 'active' | 'probation' | 'left';
  subsystemKeys: string[];
  dataScope: 'self' | 'dept' | 'deptAndSub' | 'all' | 'custom';

  sortIndex: number;
  createdBy: string;
  createdAt: string;
  lastLoginIp: string | null;
  roleGrants: RoleGrantDto[];
  permissionChanges: PermissionChangeDto[];
}

const SUBSYSTEM_KEYS_BY_DEPT: Record<string, string[]> = {
  [deptIds.finGeneralLedger]: ['admin'],
  [deptIds.finTreasury]: ['admin'],
  [deptIds.finPayable]: ['admin'],
  [deptIds.finReceivable]: ['admin'],
  [deptIds.opsLastMile]: ['admin'],
  [deptIds.opsService]: ['admin'],
  [deptIds.opsWarehouse]: ['admin'],
  [deptIds.tech]: ['admin'],
  [deptIds.hr]: ['admin'],
  [deptIds.marketing]: ['admin'],
};

const CREATED_BY = '黄仕杰';

function buildPerson(params: {
  sortIndex: number;
  id: string;
  name: string;
  account: string;
  email: string;
  employeeNo: string;
  deptId: string;
  postName: string;
  phone: string;
  gender: 'male' | 'female';
  status: 'active' | 'probation' | 'left';
  enabled: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  managerId: string | null;
  roleIds: string[];
  employmentType: 'fulltime' | 'parttime' | 'intern' | 'outsourced';
  dataScope: 'self' | 'dept' | 'deptAndSub' | 'all' | 'custom';
}): PersonRow {
  return {
    id: params.id,
    name: params.name,
    employeeNo: params.employeeNo,
    avatar: null,
    avatarId: null,
    gender: params.gender,
    phone: params.phone,
    email: params.email,
    deptId: params.deptId,
    postName: params.postName,
    postId: mockPostId(params.postName),
    managerId: params.managerId,
    employmentType: params.employmentType,
    joinedAt: params.joinedAt,
    workLocation: WORK_LOCATIONS[params.deptId] ?? '深圳总部',
    account: params.account,
    roleIds: params.roleIds,
    subsystemKeys: SUBSYSTEM_KEYS_BY_DEPT[params.deptId] ?? ['admin'],
    dataScope: params.dataScope,
    enabled: params.enabled,
    mustChangePassword: false,
    effectiveAt: null,
    remark: null,
    status: params.status,
    lastLoginAt: params.lastLoginAt,
    sortIndex: params.sortIndex,
    createdBy: CREATED_BY,
    createdAt: `${params.joinedAt} 10:22`,
    lastLoginIp: params.lastLoginAt ? `192.168.3.${20 + (params.sortIndex % 200)}` : null,
    roleGrants: [],
    permissionChanges: [],
  };
}

const userIdOf = (employeeNo: string) => `u-${employeeNo.replace('EMP-', '')}`;

function buildSeed(): PersonRow[] {
  const rows: PersonRow[] = [];

  namedSeeds.forEach((seed, index) => {
    rows.push(
      buildPerson({
        sortIndex: index,
        id: userIdOf(seed.employeeNo),
        name: seed.name,
        account: seed.account,
        email: seed.email ?? `${seed.account}@${EMAIL_DOMAIN}`,
        employeeNo: seed.employeeNo,
        deptId: seed.deptId,
        postName: seed.postName,
        phone: seed.phone.join(' '),
        gender: seed.gender,
        status: seed.status,
        enabled: seed.enabled ?? true,
        joinedAt: seed.joinedAt,
        lastLoginAt: resolveLastLogin(seed.lastLogin),
        managerId: seed.managerNo ? userIdOf(seed.managerNo) : null,
        roleIds: [...seed.roles],
        employmentType: seed.employmentType ?? 'fulltime',
        dataScope: seed.dataScope ?? 'dept',
      }),
    );
  });

  const namedByDept = new Map<string, number>();
  for (const seed of namedSeeds) {
    namedByDept.set(seed.deptId, (namedByDept.get(seed.deptId) ?? 0) + 1);
  }

  const cursor = { value: 0 };
  let generated = 0;
  // 部门顺序固定，保证生成结果稳定
  const deptOrder = [
    deptIds.finGeneralLedger,
    deptIds.finTreasury,
    deptIds.finPayable,
    deptIds.finReceivable,
    deptIds.opsLastMile,
    deptIds.opsService,
    deptIds.opsWarehouse,
    deptIds.tech,
    deptIds.hr,
    deptIds.marketing,
  ];

  for (const deptId of deptOrder) {
    const target = deptDirectHeadcounts[deptId] ?? 0;
    const already = namedByDept.get(deptId) ?? 0;
    for (let n = 0; n < target - already; n += 1) {
      const g = generated;
      generated += 1;
      const surnameIndex = g % SURNAMES.length;
      const givenIndex = (g * 7) % GIVEN.length;
      const name = `${SURNAMES[surnameIndex]}${GIVEN[givenIndex]}`;
      const account = `${SURNAME_PY[surnameIndex]}${GIVEN_PY[givenIndex]}`;
      const employeeNo = nextEmployeeNo(cursor);
      const status = GENERATED_PROBATION.has(g) ? 'probation' : GENERATED_LEFT.has(g) ? 'left' : 'active';
      const postNames = POSITIONS[deptId] ?? ['专员'];
      const leaderNo = deptLeaderEmployeeNo[deptId];
      rows.push(
        buildPerson({
          sortIndex: namedSeeds.length + g,
          id: userIdOf(employeeNo),
          name,
          account,
          email: `${account}@${EMAIL_DOMAIN}`,
          employeeNo,
          deptId,
          postName: postNames[g % postNames.length] ?? '专员',
          phone: `1${3 + (g % 6)}${g % 10} ${String(1000 + ((g * 37) % 9000))} ${String(1000 + ((g * 91) % 9000))}`,
          gender: g % 2 === 0 ? 'female' : 'male',
          status,
          enabled: !GENERATED_DISABLED.has(g),
          joinedAt: joinedAtFor(g),
          lastLoginAt: resolveLastLogin(lastLoginFor(g, status)),
          managerId: leaderNo ? userIdOf(leaderNo) : null,
          roleIds: [],
          employmentType: status === 'probation' ? 'fulltime' : g % 23 === 0 ? 'outsourced' : 'fulltime',
          dataScope: 'dept',
        }),
      );
    }
  }

  assignBoardRoles(rows);
  attachDetailFacts(rows);
  return rows;
}

const FIN_DEPTS = [deptIds.finGeneralLedger, deptIds.finTreasury, deptIds.finPayable, deptIds.finReceivable];
const OPS_DEPTS = [deptIds.opsLastMile, deptIds.opsService, deptIds.opsWarehouse];

interface RoleTarget {
  role: string;
  depts: string[] | null;
  count: number;
}

const roleTargets: RoleTarget[] = [
  { role: roleIds.cashier, depts: [deptIds.finTreasury], count: boardRoleUserCounts[roleIds.cashier] ?? 0 },
  {
    role: roleIds.labelOperator,
    depts: [deptIds.opsLastMile],
    count: boardRoleUserCounts[roleIds.labelOperator] ?? 0,
  },
  { role: roleIds.csAgent, depts: [deptIds.opsService], count: boardRoleUserCounts[roleIds.csAgent] ?? 0 },
  {
    role: roleIds.warehouseOperator,
    depts: [deptIds.opsWarehouse],
    count: boardRoleUserCounts[roleIds.warehouseOperator] ?? 0,
  },
  { role: roleIds.hrSpecialist, depts: [deptIds.hr], count: boardRoleUserCounts[roleIds.hrSpecialist] ?? 0 },
  { role: roleIds.superadmin, depts: [deptIds.tech], count: boardRoleUserCounts[roleIds.superadmin] ?? 0 },
  { role: roleIds.sysops, depts: [deptIds.tech], count: boardRoleUserCounts[roleIds.sysops] ?? 0 },
  { role: roleIds.auditor, depts: [deptIds.tech], count: boardRoleUserCounts[roleIds.auditor] ?? 0 },
  { role: roleIds.finPreparer, depts: FIN_DEPTS, count: boardRoleUserCounts[roleIds.finPreparer] ?? 0 },
  { role: roleIds.finAuditor, depts: FIN_DEPTS, count: boardRoleUserCounts[roleIds.finAuditor] ?? 0 },
  { role: roleIds.channelAdmin, depts: OPS_DEPTS, count: boardRoleUserCounts[roleIds.channelAdmin] ?? 0 },
  { role: roleIds.readonly, depts: null, count: boardRoleUserCounts[roleIds.readonly] ?? 0 },
  { role: roleIds.deptAdmin, depts: null, count: boardRoleUserCounts[roleIds.deptAdmin] ?? 0 },

  { role: roleIds.reconciler, depts: null, count: boardRoleUserCounts[roleIds.reconciler] ?? 0 },
];

function assignBoardRoles(rows: PersonRow[]) {
  const namedIds = new Set(namedSeeds.map((seed) => userIdOf(seed.employeeNo)));
  for (const target of roleTargets) {
    let current = rows.filter((row) => row.roleIds.includes(target.role)).length;
    if (current >= target.count) continue;
    for (const row of rows) {
      if (current >= target.count) break;
      if (namedIds.has(row.id)) continue;
      if (row.roleIds.includes(target.role)) continue;
      if (target.depts && !target.depts.includes(row.deptId)) continue;
      row.roleIds = [...row.roleIds, target.role];
      current += 1;
    }
  }
}

const LIN_XIAOYU_ID = userIdOf('EMP-0231');

const linXiaoyuRoleGrants: RoleGrantDto[] = [
  { roleId: roleIds.finPreparer, grantedBy: CREATED_BY, grantedByName: CREATED_BY, grantedAt: '2024-03-11' },
  { roleId: roleIds.finAuditor, grantedBy: CREATED_BY, grantedByName: CREATED_BY, grantedAt: '2025-06-02' },
];

const linXiaoyuPermissionChanges: PermissionChangeDto[] = [
  {
    at: '2026-02-09T14:22:00.000Z',
    action: 'user.assignRoles',
    operator: CREATED_BY,
    operatorName: CREATED_BY,
    addedRoleIds: [],
    removedRoleIds: [roleIds.reconciler],
  },
  {
    at: '2025-06-02T09:15:00.000Z',
    action: 'user.assignRoles',
    operator: CREATED_BY,
    operatorName: CREATED_BY,
    addedRoleIds: [roleIds.finAuditor],
    removedRoleIds: [],
  },
  {
    at: '2024-03-11T10:22:00.000Z',
    action: 'user.assignRoles',
    operator: CREATED_BY,
    operatorName: CREATED_BY,
    addedRoleIds: [roleIds.finPreparer],
    removedRoleIds: [],
  },
];

function attachDetailFacts(rows: PersonRow[]) {
  for (const row of rows) {
    if (row.id === LIN_XIAOYU_ID) {
      row.roleGrants = linXiaoyuRoleGrants.map((grant) => ({ ...grant }));
      row.permissionChanges = linXiaoyuPermissionChanges.map((change) => ({ ...change }));
    } else {
      row.roleGrants = row.roleIds.map((roleId) => ({
        roleId,
        grantedBy: CREATED_BY,
        grantedByName: CREATED_BY,
        grantedAt: row.joinedAt,
      }));
      row.permissionChanges = row.roleIds.slice(0, 1).map((roleId) => ({
        at: `${row.joinedAt}T10:22:00.000Z`,
        action: 'user.assignRoles',
        operator: CREATED_BY,
        operatorName: CREATED_BY,
        addedRoleIds: [roleId],
        removedRoleIds: [],
      }));
    }
  }
}

export const users = createCollection<PersonRow, 'id'>(buildSeed(), 'id');

export function deptLeaderUserId(deptId: string): string | null {
  const employeeNo = deptLeaderEmployeeNo[deptId];
  return employeeNo ? userIdOf(employeeNo) : null;
}

export interface FilterSchemeRow {
  editable: boolean;
  version: number;
  id: string;
  name: string;
  filters: string;
  scope: 'mine' | 'shared';
  createdAt: string;
  updatedAt: string;
}

const filterSchemeSeed: FilterSchemeRow[] = [
  {
    editable: true,
    id: '00000000-0000-4000-8000-000000000401',
    version: 0,
    name: '财务部在职',
    filters: JSON.stringify({
      op: 'and',
      items: [
        { id: 'dept', field: 'deptId', operator: 'in', value: [deptIds.fin] },
        { id: 'status', field: 'status', operator: 'eq', value: 'active' },
      ],
    }),
    scope: 'mine',
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  },
];

export const filterSchemes = createCollection<FilterSchemeRow, 'id'>(filterSchemeSeed, 'id');

export function toUserDto(row: PersonRow): UserDto {
  const {
    sortIndex: _sortIndex,
    createdBy: _createdBy,
    lastLoginIp: _lastLoginIp,
    roleGrants: _roleGrants,
    permissionChanges: _permissionChanges,
    ...dto
  } = row;
  return { ...dto, version: 0, updatedAt: new Date(row.createdAt).toISOString(), systemAdmin: false };
}

export function toUserDetail(row: PersonRow): UserDetailDto {
  const manager = row.managerId ? users.find(row.managerId) : undefined;
  const { sortIndex: _sortIndex, ...rest } = row;
  return {
    ...rest,
    version: 0,
    updatedAt: new Date(row.createdAt).toISOString(),
    systemAdmin: false,
    managerName: manager?.name ?? null,
    createdByName: row.createdBy,
    effectivePermissions: [],
    effectivePermissionLabels: [],
    scopeSources: [],
    subsystemKeys: [],
  };
}

export type { PersonRow };

export function mockPostId(name: string): string {
  let hash = 0;
  for (const char of name) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(12, '0')}`;
}
