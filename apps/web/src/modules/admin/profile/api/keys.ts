export const profileKeys = {
  all: ['account', 'profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
  devices: () => [...profileKeys.all, 'devices'] as const,
};
