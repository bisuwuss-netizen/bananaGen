import React, { useEffect, useRef, useState } from 'react';

import '../feature.css';

import { HomeCharactersFeature } from './HomeCharactersFeature';
import type { PromptMetrics } from '../types';

interface HomeCharactersPromptStageProps {
  isPromptFocused: boolean;
  hasPromptContent: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'subtle';
}

export const HomeCharactersPromptStage: React.FC<HomeCharactersPromptStageProps> = ({
  isPromptFocused,
  hasPromptContent,
  children,
  variant = 'default',
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const inputShellRef = useRef<HTMLDivElement>(null);
  const [promptMetrics, setPromptMetrics] = useState<PromptMetrics | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const stageNode = stageRef.current;
    const inputShellNode = inputShellRef.current;

    if (!stageNode || !inputShellNode) {
      return;
    }

    let frameId: number | null = null;

    const updateMetrics = () => {
      const stageRect = stageNode.getBoundingClientRect();
      const inputShellRect = inputShellNode.getBoundingClientRect();

      setPromptMetrics({
        left: inputShellRect.left - stageRect.left,
        top: inputShellRect.top - stageRect.top,
        right: inputShellRect.right - stageRect.left,
        bottom: inputShellRect.bottom - stageRect.top,
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        updateMetrics();
        frameId = null;
      });
    };

    updateMetrics();

    const observer = new ResizeObserver(() => {
      scheduleUpdate();
    });

    observer.observe(stageNode);
    observer.observe(inputShellNode);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`home-characters-prompt-stage home-characters-prompt-stage--${variant}`}
    >
      <div className="home-characters-prompt-stage__glow" aria-hidden="true" />
      <HomeCharactersFeature
        isPromptFocused={isPromptFocused}
        hasPromptContent={hasPromptContent}
        variant={variant}
        promptMetrics={promptMetrics}
      />
      <div ref={inputShellRef} className="home-characters-prompt-stage__input-shell">
        {children}
      </div>
    </div>
  );
};
