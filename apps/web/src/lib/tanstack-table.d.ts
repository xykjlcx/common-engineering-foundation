import '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';

declare const columnMetaDataType: unique symbol;
declare const columnMetaValueType: unique symbol;

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerAlign?: 'start' | 'center' | 'end';
    cellAlign?: 'start' | 'center' | 'end';
    pin?: 'left' | 'right';
    stopRowClick?: boolean;
    /** 服务端排序字段；缺省用 column.id */
    sortField?: string;
    readonly [columnMetaDataType]?: TData;
    readonly [columnMetaValueType]?: TValue;
  }
}
