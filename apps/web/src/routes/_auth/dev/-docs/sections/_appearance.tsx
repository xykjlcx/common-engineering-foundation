import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACCENTS,
  FLAVORS,
  MODES,
  ZOOMS,
  type AccentKey,
  type Flavor,
  type Mode,
  type Zoom,
} from '@/lib/appearance-dom';
import { useAppearance } from '@/stores/appearance';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

// 组件站的三轴切换条（界面风格 / 明暗 / 比例 / 主题色）+ 当前契约小卡。
// 下划线开头：不是组件族页，注册表不登记，由布局层单独渲染在导航顶部。
// data-matrix="flavor|mode|scale" 是视觉验收脚本 scripts/visual-agent-browser.mjs 的稳定选择器，不可改名。

// 三轴清单来自 appearance-dom 的唯一登记处，不在页面里再抄一份（视觉验收脚本也读同一份）
const flavors = FLAVORS;
const modes = MODES;
const scales = ZOOMS;
const flavorLabelKeys: Record<Flavor, string> = {
  feishu: 'shell.appearanceDrawer.flavorFeishu',
  claude: 'shell.appearanceDrawer.flavorClaude',
  shadcn: 'shell.appearanceDrawer.flavorShadcn',
  sera: 'shell.appearanceDrawer.flavorSera',
  pipeline: 'shell.appearanceDrawer.flavorPipeline',
};
const modeLabelKeys: Record<Mode, string> = {
  light: 'dev.themeStates.light',
  dark: 'dev.themeStates.dark',
};
const scaleLabelKeys: Record<Zoom, string> = {
  sm: 'shell.appearanceDrawer.zoomSm',
  md: 'shell.appearanceDrawer.zoomMd',
  lg: 'shell.appearanceDrawer.zoomLg',
};

export default function AppearanceControls(): JSX.Element {
  const { t } = useTranslation();
  const { flavor, mode, accent, customAccent, zoom, set, setFlavor } = useAppearance();

  return (
    <div data-slot="doc-appearance-bar" className="flex flex-col gap-2">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-text-3 [&>*:last-child]:w-[calc(150px*var(--app-scale))]">
          {t('shell.appearanceDrawer.flavor')}
          <NativeSelect
            data-matrix="flavor"
            value={flavor}
            onChange={(event) => setFlavor(event.currentTarget.value as typeof flavor)}
          >
            {flavors.map((item) => (
              <option key={item} value={item}>
                {t(flavorLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-text-3 [&>*:last-child]:w-[calc(150px*var(--app-scale))]">
          {t('dev.themeStates.mode')}
          <NativeSelect
            data-matrix="mode"
            value={mode}
            onChange={(event) => set({ mode: event.currentTarget.value as typeof mode })}
          >
            {modes.map((item) => (
              <option key={item} value={item}>
                {t(modeLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-text-3 [&>*:last-child]:w-[calc(150px*var(--app-scale))]">
          {t('dev.themeStates.scale')}
          <NativeSelect
            data-matrix="scale"
            value={zoom}
            onChange={(event) => set({ zoom: event.currentTarget.value as typeof zoom })}
          >
            {scales.map((item) => (
              <option key={item} value={item}>
                {t(scaleLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-text-3 [&>*:last-child]:w-[calc(150px*var(--app-scale))]">
          {t('shell.appearanceDrawer.accent')}
          <NativeSelect
            value={accent}
            onChange={(event) => set({ accent: event.currentTarget.value as AccentKey })}
          >
            {ACCENTS.map((item) => (
              <option key={item.key} value={item.key}>
                {t(`shell.appearanceDrawer.${item.labelKey}`)}
              </option>
            ))}
            <option value="custom">{t('shell.appearanceDrawer.accentCustom')}</option>
          </NativeSelect>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-text-3 [&>*:last-child]:w-[calc(150px*var(--app-scale))]">
          {t('shell.appearanceDrawer.accentCustom')}
          <Input
            value={customAccent}
            onChange={(event) => set({ accent: 'custom', customAccent: event.currentTarget.value })}
            placeholder={t('dev.themeStates.customAccentPlaceholder')}
          />
        </label>
      </section>
    </div>
  );
}
