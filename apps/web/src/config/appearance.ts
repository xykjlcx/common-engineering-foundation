import { appConfig } from './app';

// 外观配置只提供初始默认值；用户运行时切换后的选择由 appearance store 持久化。
// 这里保留一个默认自定义色，是为了让“自定义主题色”控件打开时有稳定起点。
export const appearanceConfig = {
  storageKey: appConfig.storageKeys.appearance,
  defaults: {
    // 其余 flavor / 布局保留可切。
    flavor: 'pipeline',
    mode: 'light',
    accent: 'pipeline',
    customAccent: '#d97757',
    zoom: 'md',
    radius: 'default',
    layout: 'pipeline',
    pageAnim: 'fade',
  },
} as const;
