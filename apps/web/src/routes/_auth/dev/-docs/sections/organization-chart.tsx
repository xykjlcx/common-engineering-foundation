import { useState } from 'react';
import { OrganizationChart } from '@/components/pro/OrganizationChart';
const labels = {
  tree: '组织图',
  empty: '暂无节点',
  hint: '选择 / 收起 / 展开 / 键盘方向键',
  zoomIn: '放大',
  zoomOut: '缩小',
  reset: '重置',
  expand: (name: string) => `展开${name}`,
  collapse: (name: string) => `收起${name}`,
};
const nodes = [
  { id: 'root', parentId: null, label: '总公司', description: '公司', meta: '12 人 · 含下级' },
  { id: 'company', parentId: 'root', label: '江苏公司', description: '公司', meta: '8 人 · 含下级' },
  {
    id: 'department',
    parentId: 'company',
    label: '研发部门 · 超长名称用于验证截断',
    description: '部门',
    meta: '8 人 · 含下级',
  },
  {
    id: 'disabled',
    parentId: 'root',
    label: '停用节点',
    description: '部门 · 停用',
    meta: '4 人 · 含下级',
    unavailable: true,
  },
];
export default function OrganizationChartMatrix() {
  const [selected, setSelected] = useState('company');
  return (
    <div data-testid="organizationChartMatrix" className="grid gap-4">
      <OrganizationChart nodes={nodes} selectedId={selected} onSelect={setSelected} labels={labels} />
      <OrganizationChart nodes={[]} onSelect={() => {}} labels={labels} />
    </div>
  );
}
