import React from 'react';

import '../feature.css';

import { useHomeCharactersConfig } from '../hooks/useHomeCharactersConfig';
import type { HomeCharactersMood, PromptMetrics } from '../types';
import { HomeCharactersScene } from './HomeCharactersScene';

interface HomeCharactersFeatureProps {
  isPromptFocused: boolean;
  hasPromptContent: boolean;
  variant?: 'default' | 'subtle';
  promptMetrics?: PromptMetrics | null;
}

const resolveMood = (isPromptFocused: boolean, hasPromptContent: boolean): HomeCharactersMood => {
  if (isPromptFocused) {
    return 'engaged';
  }

  if (hasPromptContent) {
    return 'ready';
  }

  return 'idle';
};

export const HomeCharactersFeature: React.FC<HomeCharactersFeatureProps> = ({
  isPromptFocused,
  hasPromptContent,
  variant = 'default',
  promptMetrics = null,
}) => {
  const config = useHomeCharactersConfig();
  const mood = resolveMood(isPromptFocused, hasPromptContent);

  return (
    <div
      className={`home-characters-feature home-characters-feature--${mood}`}
      aria-hidden="true"
    >
      <HomeCharactersScene
        config={config}
        mood={mood}
        variant={variant}
        promptMetrics={promptMetrics}
      />
    </div>
  );
};
