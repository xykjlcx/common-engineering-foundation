import { settingsConstraints } from './slices/settings-constraints.js';
import { querySettings } from './slices/query-settings.js';
import { updateSettings } from './slices/update-settings.js';
import { publicSettings } from './slices/public-settings.js';
export const settingsRouter = {
  constraints: settingsConstraints,
  query: querySettings,
  update: updateSettings,
  public: publicSettings,
};
