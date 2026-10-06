export {
  assertDepartmentAssignable,
  departmentDescendants,
  getDepartmentReference as getDepartment,
  getDepartmentReferences as getDepartments,
} from './domain/dept-access.js';
export { DEPT_PERMS } from './permissions.js';
export { lockDepartmentTree } from './domain/dept-reference.js';
