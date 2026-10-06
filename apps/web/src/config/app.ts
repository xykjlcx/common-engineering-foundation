// appConfig 放“工程级默认值”：路由常量与存储 key。
// 它不是运行时状态，用户可变的外观/登录态分别交给对应 store。
export const appConfig = {
  routes: {
    home: '/admin/dashboard',
    login: '/login',
    forbidden: '/403',
  },
  storageKeys: {
    appearance: 'appearance',
  },
} as const;
