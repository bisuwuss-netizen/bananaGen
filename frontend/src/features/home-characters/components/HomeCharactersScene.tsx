import React, { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type {
  CharacterLayoutOverride,
  HomeCharacterConfig,
  HomeCharactersConfig,
  HomeCharactersMood,
  PointerState,
  PromptMetrics,
} from '../types';
import { CharacterFigure } from './CharacterFigure';

const DEFAULT_POINTER: PointerState = { x: 0.14, y: -0.08 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface HomeCharactersSceneProps {
  config: HomeCharactersConfig;
  mood: HomeCharactersMood;
  variant?: 'default' | 'subtle';
  promptMetrics?: PromptMetrics | null;
}

const getSubtleLayoutOverride = (
  character: HomeCharacterConfig,
  promptMetrics: PromptMetrics | null | undefined
): CharacterLayoutOverride | undefined => {
  if (!promptMetrics) {
    return undefined;
  }

  const topAnchors: Record<string, { left: number; top: number }> = {
    'purple-editor': {
      left: promptMetrics.left + 66,
      top: promptMetrics.top - 98,
    },
    'black-editor': {
      left: promptMetrics.right - 114,
      top: promptMetrics.top - 72,
    },
    'orange-editor': {
      left: promptMetrics.left - 100,
      top: promptMetrics.bottom - 128,
    },
    'yellow-editor': {
      left: promptMetrics.right - 18,
      top: promptMetrics.bottom - 124,
    },
  };

  const anchor = topAnchors[character.id];

  if (!anchor) {
    return undefined;
  }

  return {
    left: anchor.left,
    top: anchor.top,
    width: character.width,
    height: character.height,
  };
};

export const HomeCharactersScene: React.FC<HomeCharactersSceneProps> = ({
  config,
  mood,
  variant = 'default',
  promptMetrics = null,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const currentPointerRef = useRef<PointerState>(DEFAULT_POINTER);
  const targetPointerRef = useRef<PointerState>(DEFAULT_POINTER);
  const [pointer, setPointer] = useState<PointerState>(DEFAULT_POINTER);
  const [pageVisible, setPageVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      setPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const sceneNode = sceneRef.current;
    const motionEnabled = !prefersReducedMotion && pageVisible;

    if (!sceneNode || !motionEnabled) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      currentPointerRef.current = DEFAULT_POINTER;
      targetPointerRef.current = DEFAULT_POINTER;
      setPointer(DEFAULT_POINTER);
      return;
    }

    const tick = () => {
      const current = currentPointerRef.current;
      const target = targetPointerRef.current;

      const nextX = current.x + (target.x - current.x) * 0.16;
      const nextY = current.y + (target.y - current.y) * 0.16;
      currentPointerRef.current = { x: nextX, y: nextY };
      setPointer(currentPointerRef.current);

      if (Math.abs(nextX - target.x) > 0.001 || Math.abs(nextY - target.y) > 0.001) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    const ensureAnimation = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = sceneNode.getBoundingClientRect();
      const normalizedX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const normalizedY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      targetPointerRef.current = { x: normalizedX, y: normalizedY };
      ensureAnimation();
    };

    const handlePointerLeave = () => {
      targetPointerRef.current = DEFAULT_POINTER;
      ensureAnimation();
    };

    sceneNode.addEventListener('pointermove', handlePointerMove);
    sceneNode.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      sceneNode.removeEventListener('pointermove', handlePointerMove);
      sceneNode.removeEventListener('pointerleave', handlePointerLeave);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [pageVisible, prefersReducedMotion]);

  const motionEnabled = !prefersReducedMotion && pageVisible;

  return (
    <div ref={sceneRef} className="home-characters-feature__scene">
      {config.characters.map((character) => (
        <CharacterFigure
          key={character.id}
          character={character}
          sceneWidth={config.scene_width}
          sceneHeight={config.scene_height}
          pointer={pointer}
          mood={mood}
          motionEnabled={motionEnabled}
          layoutOverride={
            variant === 'subtle'
              ? getSubtleLayoutOverride(character, promptMetrics)
              : undefined
          }
        />
      ))}
    </div>
  );
};
