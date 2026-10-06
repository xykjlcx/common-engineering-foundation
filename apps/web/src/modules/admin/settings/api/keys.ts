export const settingsKeys = {
  all: ['system', 'settings'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
  public: () => [...settingsKeys.all, 'public'] as const,
  constraints: () => [...settingsKeys.all, 'constraints'] as const,
};
