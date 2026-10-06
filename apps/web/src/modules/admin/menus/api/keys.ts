export const menuKeys = {
  all: ['nav'] as const,
  navigation: () => [...menuKeys.all, 'navigation'] as const,
  management: (subsystem: string) => ['nav', 'menus', 'management', subsystem] as const,
  menuLists: () => [...menuKeys.all, 'menus'] as const,
};
