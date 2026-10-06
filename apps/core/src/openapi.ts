import { isLazy, isProcedure } from '@orpc/server';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import * as z from 'zod';
import { errorStatuses } from './errors.js';
import { router } from './router.js';

export const PROBLEM_SCHEMA = {
  type: 'object',
  description: 'RFC7807 错误信封 + code/params/traceId 扩展成员（ADR-005）',
  required: ['type', 'title', 'status', 'code', 'params'],
  properties: {
    type: { type: 'string', example: 'about:blank' },
    title: { type: 'string', description: '等于 code' },
    status: { type: 'integer' },
    code: { type: 'string', description: '稳定错误码（领域.对象.问题，如 user.not_found）' },
    params: { type: 'object', description: '结构化参数，前端按 code + params 渲染文案' },
    traceId: { type: ['string', 'null'] },
  },
} as const;

const SpecShape = z.looseObject({
  openapi: z.string(),
  components: z.looseObject({ schemas: z.record(z.string(), z.unknown()).optional() }).optional(),
  paths: z
    .record(
      z.string(),
      z.record(z.string(), z.looseObject({ responses: z.record(z.string(), z.unknown()).optional() })),
    )
    .optional(),
});

export type OpenApiSpec = z.infer<typeof SpecShape>;

export function attachErrorResponses(specInput: unknown): OpenApiSpec {
  const spec = SpecShape.parse(specInput);
  spec.components = spec.components ?? {};
  spec.components.schemas = { ...spec.components.schemas, Problem: PROBLEM_SCHEMA };
  for (const operations of Object.values(spec.paths ?? {})) {
    for (const op of Object.values(operations)) {
      // REST 适配层统一返回 Problem；精确错误状态保留，内容类型与真实响应一致。
      for (const [status, response] of Object.entries(op.responses ?? {})) {
        if (!/^[45]\d{2}$/.test(status)) continue;
        const description = z.looseObject({ description: z.string().optional() }).parse(response).description;
        if (!op.responses) continue;
        op.responses[status] = {
          description: description ?? '错误响应',
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        };
      }
      op.responses = {
        ...op.responses,
        default: {
          description: '错误响应（RFC7807，REST 开放面统一 application/problem+json）',
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        },
      };
    }
  }
  return spec;
}

export type ProcedureErrorStatus = { procedure: string; code: string; status: number };

interface ProcedureErrorMap {
  errorMap?: Record<string, { status?: number }>;
}

function defOf(procedure: unknown): ProcedureErrorMap {
  return (procedure as Record<'~orpc', ProcedureErrorMap>)['~orpc'];
}

export function collectProcedureErrorStatuses(tree: unknown): ProcedureErrorStatus[] {
  const acc: ProcedureErrorStatus[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (node === null || typeof node !== 'object') return;
    if (isLazy(node)) {
      throw new Error(`router 含 lazy 子树（${prefix || '<root>'}）：OpenAPI 错误状态校验拒绝遍历`);
    }
    if (isProcedure(node)) {
      for (const [code, def] of Object.entries(defOf(node).errorMap ?? {})) {
        acc.push({ procedure: prefix, code, status: def.status ?? Number.NaN });
      }
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      walk(value, prefix ? `${prefix}.${key}` : key);
    }
  };
  walk(tree, '');
  return acc;
}

export function assertProcedureErrorStatuses(
  entries: readonly ProcedureErrorStatus[],
  statusByCode: ReadonlyMap<string, number>,
): void {
  const mismatches: string[] = [];
  for (const entry of entries) {
    const expected = statusByCode.get(entry.code);
    if (expected === undefined || expected !== entry.status) {
      mismatches.push(
        `${entry.procedure} ${entry.code}: procedure=${String(entry.status)} table=${expected === undefined ? 'missing' : String(expected)}`,
      );
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`procedure .errors() status 与 errorStatuses 不一致：${mismatches.join('；')}`);
  }
}

export async function generateSpec(): Promise<OpenApiSpec> {
  assertProcedureErrorStatuses(collectProcedureErrorStatuses(router), errorStatuses.statusByCode);
  const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
  const raw = await generator.generate(router, {
    info: { title: 'keel core', version: '0.1.0' },
    servers: [{ url: '/api/v1' }],
  });
  return attachErrorResponses(raw);
}
