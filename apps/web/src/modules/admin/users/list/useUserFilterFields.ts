import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  FilterBuilderLabels,
  FilterBuilderRowLabels,
  FilterOperator,
} from '@/components/pro/filter-builder';
import type { FilterChipsLabels } from '@/components/pro/filter-chips';
import type { FilterMenuLabels } from '@/components/pro/filter-menu/FilterMenu';
import type { FilterValuePanelLabels } from '@/components/pro/filter-menu/FilterValuePanel';
import {
  userPostsQuery,
  userDeptTreeQuery as deptTreeQuery,
  userRolesQuery as rolesQuery,
} from '../api/dictionaries';
import { usersQuery, type UsersQueryParams } from '../api';
import { userFilterFields } from '../model';

export function useUserFilterFields(params: UsersQueryParams) {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const { data: posts = [] } = useQuery(userPostsQuery);
  const { data: roles = [] } = useQuery(rolesQuery);
  const { data: page } = useQuery(usersQuery(params));

  const workLocations = useMemo(
    () =>
      [...new Set((page?.list ?? []).map((user) => user.workLocation))]
        .filter((value): value is string => !!value)
        .sort(),
    [page],
  );

  const pickerLabels = useMemo(
    () => ({
      searchPlaceholder: t('users.filters.deptSearchPlaceholder'),
      frequent: t('users.filters.frequent'),
      empty: t('users.filters.noMatch'),
      matchHint: (query: string, count: number) => t('users.filters.matchHint', { query, count }),
      hints: [t('users.filters.hintMove'), t('users.filters.hintConfirm'), t('users.filters.hintClose')],
    }),
    [t],
  );

  const fields = useMemo(
    () =>
      userFilterFields({
        t: (key) => t(`users.filters.${key}`),
        pickerLabels,
        depts,
        roles,
        posts,
        workLocations,
      }).map((field) =>
        field.key === 'postId' || field.key === 'deptId' || field.key === 'status' || field.key === 'roleIds'
          ? { ...field, quick: true }
          : field,
      ),
    [depts, pickerLabels, posts, roles, t, workLocations],
  );

  const operatorLabels: Partial<Record<FilterOperator, string>> = {
    contains: t('users.filters.operators.contains'),
    eq: t('users.filters.operators.eq'),
    ne: t('users.filters.operators.ne'),
    in: t('users.filters.operators.in'),
    notIn: t('users.filters.operators.notIn'),
    gte: t('users.filters.operators.gte'),
    lte: t('users.filters.operators.lte'),
    between: t('users.filters.operators.between'),
    isEmpty: t('users.filters.operators.isEmpty'),
    isNotEmpty: t('users.filters.operators.isNotEmpty'),
  };

  const builderLabels: FilterBuilderLabels = {
    filter: t('users.filters.label'),
    add: t('users.filters.addCondition'),
    and: t('users.filters.and'),
    or: t('users.filters.or'),
    remove: t('users.filters.removeCondition'),
    field: t('users.filters.field'),
    operator: t('users.filters.operator'),
    value: t('users.filters.value'),
    group: t('users.filters.group'),
    ungroup: t('users.filters.ungroup'),
    emptyValue: t('users.filters.emptyValue'),
    rangeFrom: t('users.filters.rangeFrom'),
    rangeTo: t('users.filters.rangeTo'),
    toggleConnector: t('users.filters.toggleConnector'),
  };

  const rowLabels: FilterBuilderRowLabels = {
    groupTitle: t('users.filters.groupTitle'),
    groupAny: t('users.filters.groupAny'),
    groupAll: t('users.filters.groupAll'),
    addGroup: t('users.filters.addGroup'),
    addInGroup: t('users.filters.addInGroup'),
    pickValue: t('users.filters.pickValue'),
    includeSub: t('users.filters.includeSub'),
  };

  const panelLabels: FilterValuePanelLabels = {
    // 二级面板里的搜索框过滤的是「选项」，不是一级菜单的字段 / 方案（review C1）；
    // 部门树自带 field.pickerLabels.searchPlaceholder（「搜索名称或编码」），不吃这条。
    searchPlaceholder: t('users.filters.optionSearch'),
    includeSub: t('users.filters.includeSubDept'),
    commitHint: t('users.filters.commitHint'),
    quickRanges: [
      { key: 'today', label: t('users.filters.quick.today') },
      { key: 'last7', label: t('users.filters.quick.last7') },
      { key: 'last30', label: t('users.filters.quick.last30') },
      { key: 'thisMonth', label: t('users.filters.quick.thisMonth') },
      { key: 'lastMonth', label: t('users.filters.quick.lastMonth') },
      { key: 'thisQuarter', label: t('users.filters.quick.thisQuarter') },
    ],
    rangeFrom: t('users.filters.rangeFrom'),
    rangeTo: t('users.filters.rangeTo'),
    textOps: {
      contains: t('users.filters.textOps.contains'),
      eq: t('users.filters.textOps.eq'),
      isEmpty: t('users.filters.textOps.isEmpty'),
    },
    enterHint: t('users.filters.enterHint'),
    clearText: t('users.filters.clearText'),
    empty: t('users.filters.noMatch'),
  };

  const chipsLabels: FilterChipsLabels = {
    advanced: t('users.filters.advanced'),
    clear: t('users.filters.chips.clear'),
    modified: t('users.filters.chips.modified'),
    save: t('users.filters.chips.save'),
    saveAs: t('users.filters.chips.saveAs'),
    more: (n) => t('users.filters.chips.more', { count: n }),
    collapse: t('users.filters.chips.collapse'),
    removeCondition: (label) => `${t('users.filters.removeCondition')} ${label}`,
    schemesTitle: t('users.filters.chips.schemesTitle'),
    manageSchemes: t('users.filters.chips.manage'),
    includeSub: t('users.filters.includeSubDept'),
    operators: operatorLabels,
  };

  const menuLabels: FilterMenuLabels = {
    trigger: t('users.filters.label'),
    searchPlaceholder: t('users.filters.menuSearch'),
    schemesTitle: t('users.filters.schemesTitle'),
    fieldsTitle: t('users.filters.fieldsTitle'),
    advanced: t('users.filters.advanced'),
    conditionCount: (n) => t('users.filters.conditionCount', { count: n }),
    commitHint: t('users.filters.commitHint'),
  };

  return { fields, operatorLabels, builderLabels, rowLabels, panelLabels, chipsLabels, menuLabels };
}
