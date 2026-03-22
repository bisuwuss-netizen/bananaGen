import { techBlueTheme } from './tech-blue';
import { academicTheme } from './academic';
import { interactiveTheme } from './interactive';
import { visualTheme } from './visual';
import { practicalTheme } from './practical';
import { modernTheme } from './modern';
import { eduDarkTheme } from './edu-dark';
import { minimalCleanTheme } from './minimal-clean';
import { warmEduTheme } from './warm-edu';
import { businessProTheme } from './business-pro';
import type { ThemeConfig } from '../types/schema';

export const themeMap: Record<string, ThemeConfig> = {
  tech_blue: techBlueTheme,
  academic: academicTheme,
  interactive: interactiveTheme,
  visual: visualTheme,
  practical: practicalTheme,
  modern: modernTheme,
  edu_dark: eduDarkTheme,
  minimal_clean: minimalCleanTheme,
  warm_edu: warmEduTheme,
  business_pro: businessProTheme,
};

export const getThemeByScheme = (schemeId?: string): ThemeConfig => {
  if (!schemeId) return eduDarkTheme;
  return themeMap[schemeId] || eduDarkTheme;
};

export {
  techBlueTheme,
  academicTheme,
  interactiveTheme,
  visualTheme,
  practicalTheme,
  modernTheme,
  eduDarkTheme,
  minimalCleanTheme,
  warmEduTheme,
  businessProTheme,
};
