import * as z from 'zod';

export type BooleanFilterResult = { kind: 'all' } | { kind: 'none' } | { kind: 'value'; value: boolean };

/** 有限二值条件树；只共享契约与真值计算，字段及 SQL 仍由业务模块定义。 */
export function booleanFilterContract(field: string, trueValue: string, falseValue: string) {
  const valueSchema = z.enum([trueValue, falseValue]);
  const conditionSchema = z
    .object({
      id: z.string(),
      field: z.literal(field),
      operator: z.enum(['eq', 'ne', 'in', 'notIn']),
      value: z.union([valueSchema, z.array(valueSchema).min(1)]),
      scope: z.literal('exact').optional(),
    })
    .strict();
  const groupSchema = z
    .object({
      id: z.string(),
      op: z.enum(['and', 'or']),
      items: z.array(conditionSchema).min(1),
    })
    .strict();
  const rootSchema = z
    .object({
      op: z.literal('and'),
      items: z.array(z.union([groupSchema, conditionSchema])),
    })
    .strict();
  const jsonSchema = z
    .string()
    .max(4000)
    .superRefine((raw, ctx) => {
      try {
        if (!rootSchema.safeParse(JSON.parse(raw) as unknown).success) {
          ctx.addIssue({ code: 'custom', message: 'invalid filters' });
        }
      } catch {
        ctx.addIssue({ code: 'custom', message: 'filters must be json' });
      }
    });

  function resolve(input: unknown): BooleanFilterResult {
    const root = rootSchema.parse(input);
    const conditionMatches = (condition: z.infer<typeof conditionSchema>, value: string) => {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      const included = values.includes(value);
      return condition.operator === 'ne' || condition.operator === 'notIn' ? !included : included;
    };
    const matches = (value: string) =>
      root.items.every((node) => {
        if (!('items' in node)) return conditionMatches(node, value);
        return node.op === 'and'
          ? node.items.every((condition) => conditionMatches(condition, value))
          : node.items.some((condition) => conditionMatches(condition, value));
      });
    const on = matches(trueValue);
    const off = matches(falseValue);
    if (on && off) return { kind: 'all' };
    if (!on && !off) return { kind: 'none' };
    return { kind: 'value', value: on };
  }

  return { rootSchema, jsonSchema, resolve };
}
