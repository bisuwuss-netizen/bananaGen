import React from 'react';

import '../feature.css';

import { HomeCharactersFeature } from './HomeCharactersFeature';

interface HomeCharactersPromptStageProps {
  isPromptFocused: boolean;
  hasPromptContent: boolean;
  children: React.ReactNode;
}

export const HomeCharactersPromptStage: React.FC<HomeCharactersPromptStageProps> = ({
  isPromptFocused,
  hasPromptContent,
  children,
}) => {
  return (
    <div className="home-characters-prompt-stage">
      <div className="home-characters-prompt-stage__glow" aria-hidden="true" />
      <HomeCharactersFeature
        isPromptFocused={isPromptFocused}
        hasPromptContent={hasPromptContent}
      />
      <div className="home-characters-prompt-stage__input-shell">
        {children}
      </div>
    </div>
  );
};
