import { techBlueTheme } from './tech-blue';
import { academicTheme } from './academic';
import { interactiveTheme } from './interactive';
import { visualTheme } from './visual';
import { practicalTheme } from './practical';
import { modernTheme } from './modern';
import type { ThemeConfig } from '../types/schema';

export const themeMap: Record<string, ThemeConfig> = {
  tech_blue: techBlueTheme,
  academic: academicTheme,
  interactive: interactiveTheme,
  visual: visualTheme,
  practical: practicalTheme,
  modern: modernTheme,
};

export const getThemeByScheme = (schemeId?: string): ThemeConfig => {
  if (!schemeId) return techBlueTheme;
  return themeMap[schemeId] || techBlueTheme;
};

export {
  techBlueTheme,
  academicTheme,
  interactiveTheme,
  visualTheme,
  practicalTheme,
  modernTheme,
};
