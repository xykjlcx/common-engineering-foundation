import { queryItem } from './slices/query-item.js';
import { queryType } from './slices/query-type.js';
import { queryTypes } from './slices/query-types.js';
import { queryItems } from './slices/query-items.js';
import { queryOptions } from './slices/query-options.js';
import { createType } from './slices/create-type.js';
import { updateType } from './slices/update-type.js';
import { deleteType } from './slices/delete-type.js';
import { createItem } from './slices/create-item.js';
import { updateItem } from './slices/update-item.js';
import { deleteItem } from './slices/delete-item.js';

export const dictRouter = {
  item: queryItem,
  type: queryType,
  types: queryTypes,
  items: queryItems,
  options: queryOptions,
  createType: createType,
  updateType: updateType,
  deleteType: deleteType,
  createItem: createItem,
  updateItem: updateItem,
  deleteItem: deleteItem,
};
