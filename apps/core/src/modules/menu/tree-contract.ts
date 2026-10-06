import * as z from 'zod';

export const MENU_TYPES = ['dir', 'menu', 'action'] as const;
export type MenuType = (typeof MENU_TYPES)[number];

export const MenuTypeSchema = z.enum(MENU_TYPES);

/** 树节点的业务字段面（= 线上 DTO 去掉 children；两处共用一个类型，禁各写一份 interface） */
export interface MenuRecordData {
  id: string;
  catalogIdentity: string | null;
  origin: 'catalog' | 'runtime';
  runtimeManaged: boolean;
  parentId: string | null;
  subsystemKey: string;
  type: MenuType;
  label: Record<string, string>;
  icon: string | null;
  path: string | null;
  permCode: string | null;
  visible: boolean;
  sort: number;
  /** 乐观锁版本：树是管理面编辑的数据源，客户端拿它直接走 update/delete 的 version 入参 */
  version: number;
}

export interface MenuTreeNode extends MenuRecordData {
  children: MenuTreeNode[];
}

// 管理树包含隐藏节点与按钮，避免节点隐藏后无法再管理。

/** 递归类型需显式标注；oRPC 转换器展开深层 schema 时可能退化为空对象，REST 产物需单独验证。 */
export const MenuNodeSchema: z.ZodType<MenuTreeNode> = z.lazy(() =>
  z.object({
    id: z.uuid(),
    catalogIdentity: z.string().nullable(),
    origin: z.enum(['catalog', 'runtime']),
    runtimeManaged: z.boolean(),
    parentId: z.uuid().nullable(),
    subsystemKey: z.string(),
    type: MenuTypeSchema,
    label: z.record(z.string(), z.string()),
    icon: z.string().nullable(),
    path: z.string().nullable(),
    permCode: z.string().nullable(),
    visible: z.boolean(),
    sort: z.number().int(),

    version: z.number().int(),
    children: z.array(MenuNodeSchema),
  }),
);
