import { createScheme } from './slices/create-scheme.js';
import { deleteScheme } from './slices/delete-scheme.js';
import { listSchemes } from './slices/list-schemes.js';
import { updateScheme } from './slices/update-scheme.js';
export const querySchemeRouter = {
  list: listSchemes,
  create: createScheme,
  update: updateScheme,
  delete: deleteScheme,
};
