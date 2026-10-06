import { useTranslation } from 'react-i18next';
import type { FilterFieldDef } from '@/components/pro/filter-builder';
import { AUDIT_MODULES, AUDIT_OUTCOMES } from '../model';

interface ActorOption {
  id: string;
  name: string;
}

/** 操作日志的筛选字段与值面板文案；操作人选项由调用方传入（Scene 持有 actors 查询）。 */
export function useOperationFilterFields(actors: readonly ActorOption[]) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');

  const fields: FilterFieldDef[] = [
    {
      key: 'actorId',
      label: t('audit.actor'),
      input: 'select',
      operators: ['eq'],
      options: actors.map((actor) => ({ value: actor.id, label: actor.name })),
      quick: true,
    },
    {
      key: 'actionPrefix',
      label: t('audit.module'),
      input: 'select',
      operators: ['eq'],
      options: AUDIT_MODULES.map((module) => ({ value: `${module}.`, label: t(`audit.modules.${module}`) })),
      quick: true,
    },
    {
      key: 'outcome',
      label: t('audit.outcome'),
      input: 'select',
      operators: ['eq'],
      options: AUDIT_OUTCOMES.map((value) => ({ value, label: t(`audit.outcomes.${value}`) })),
      quick: true,
    },
    ...(['objectType', 'objectId', 'traceId'] as const).map((key) => ({
      key,
      label: t(`audit.filterNames.${key}`),
      input: 'text' as const,
      operators: ['eq' as const],
    })),
  ];

  const panelLabels = {
    searchPlaceholder: tc('list.filters.optionSearch'),
    includeSub: tc('list.filters.includeSub'),
    commitHint: tc('list.filters.commitHint'),
    quickRanges: [],
    rangeFrom: t('audit.from'),
    rangeTo: t('audit.to'),
    textOps: {
      contains: tc('list.filters.textOps.contains'),
      eq: t('audit.equals'),
      isEmpty: tc('list.filters.textOps.isEmpty'),
    },
    enterHint: tc('list.filters.enterHint'),
    clearText: t('audit.clear'),
    empty: tc('list.filters.noMatch'),
  };

  return { fields, panelLabels };
}
