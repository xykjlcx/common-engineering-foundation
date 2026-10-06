import { createDept } from './slices/create-dept.js';
import { deleteDept } from './slices/delete-dept.js';
import { getDeptDetail } from './slices/get-dept-detail.js';
import { queryDeptLeaderOptions } from './slices/query-dept-leader-options.js';
import { queryDeptTree } from './slices/query-dept-tree.js';
import { updateDept } from './slices/update-dept.js';
import { previewDeptChange } from './slices/preview-dept-change.js';
import { queryDeptReferences } from './slices/query-dept-references.js';

export const deptRouter = {
  detail: getDeptDetail,
  leaderOptions: queryDeptLeaderOptions,
  delete: deleteDept,
  create: createDept,
  update: updateDept,
  tree: queryDeptTree,
  preview: previewDeptChange,
  references: queryDeptReferences,
};
