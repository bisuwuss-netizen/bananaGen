import React, { useEffect, useState } from 'react';

import type {
  HomeCharacterConfig,
  HomeCharactersMood,
  PointerState,
} from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const value = Number.parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const useBlinkState = (enabled: boolean) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setIsBlinking(false);
      return;
    }

    let blinkTimer: number | null = null;
    let resetTimer: number | null = null;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        resetTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, 2800 + Math.random() * 2600);
    };

    scheduleBlink();

    return () => {
      if (blinkTimer !== null) {
        window.clearTimeout(blinkTimer);
      }
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
    };
  }, [enabled]);

  return isBlinking;
};

interface CharacterFigureProps {
  character: HomeCharacterConfig;
  sceneWidth: number;
  sceneHeight: number;
  pointer: PointerState;
  mood: HomeCharactersMood;
  motionEnabled: boolean;
}

export const CharacterFigure: React.FC<CharacterFigureProps> = ({
  character,
  sceneWidth,
  sceneHeight,
  pointer,
  mood,
  motionEnabled,
}) => {
  const showOpenEyes = mood === 'engaged';
  const isBlinking = useBlinkState(motionEnabled && showOpenEyes && character.blink_enabled);

  const moodIntensity = mood === 'engaged' ? 1 : mood === 'ready' ? 0.45 : 0;
  const extraHeight = mood === 'engaged' ? character.focus_height_delta : 0;
  const faceShiftX = motionEnabled && showOpenEyes
    ? clamp(pointer.x * character.max_face_x * character.face_x_factor, -character.max_face_x, character.max_face_x)
    : 0;
  const faceShiftY = motionEnabled && showOpenEyes
    ? clamp(pointer.y * character.max_face_y * character.face_y_factor, -character.max_face_y, character.max_face_y)
    : 0;
  const skew = motionEnabled && showOpenEyes
    ? clamp(-pointer.x * character.max_skew * character.skew_factor, -character.max_skew, character.max_skew)
    : 0;
  const translateX = character.focus_shift_x * moodIntensity;
  const translateY = character.focus_shift_y * moodIntensity + (mood !== 'idle' ? character.ready_shift_y : 0);
  const eyeLeftPercent = (character.eye_left / character.width) * 100;
  const eyeTopPercent = (character.eye_top / character.height) * 100;
  const eyeWidthPercent = (character.eye_size / character.width) * 100;
  const eyeHeightPercent = (character.eye_size / character.height) * 100;
  const eyeShiftXPercent = (faceShiftX / character.width) * 100;
  const eyeShiftYPercent = (faceShiftY / character.height) * 100;
  const pupilShiftXPercent = motionEnabled ? (faceShiftX / character.eye_size) * 26 : 0;
  const pupilShiftYPercent = motionEnabled ? (faceShiftY / character.eye_size) * 26 : 0;
  const closedEyeHeight = Math.max(eyeHeightPercent * 0.16, 1.2);
  const fillAlpha = mood === 'engaged' ? 0.32 : mood === 'ready' ? 0.24 : 0.16;
  const strokeAlpha = mood === 'engaged' ? 0.84 : mood === 'ready' ? 0.68 : 0.5;
  const shadowAlpha = mood === 'engaged' ? 0.22 : mood === 'ready' ? 0.16 : 0.09;
  const pupilAlpha = mood === 'engaged' ? 0.96 : mood === 'ready' ? 0.84 : 0.7;
  const fillColorTop = hexToRgba(character.background, Math.min(fillAlpha + 0.08, 0.42));
  const fillColorBottom = hexToRgba(character.background, fillAlpha);
  const strokeColor = hexToRgba(character.background, strokeAlpha);
  const shadowColor = hexToRgba(character.background, shadowAlpha);
  const detailColor = hexToRgba(character.pupil_color, pupilAlpha);
  const hasMouth =
    character.mouth_width !== undefined &&
    character.mouth_width !== null &&
    character.mouth_left !== undefined &&
    character.mouth_left !== null &&
    character.mouth_top !== undefined &&
    character.mouth_top !== null;

  return (
    <div
      className="home-characters-feature__figure"
      data-testid="home-character-figure"
      data-character-id={character.id}
      style={{
        left: `${(character.left / sceneWidth) * 100}%`,
        bottom: `${(character.bottom / sceneHeight) * 100}%`,
        width: `${(character.width / sceneWidth) * 100}%`,
        height: `${((character.height + extraHeight) / sceneHeight) * 100}%`,
        zIndex: character.layer,
        borderRadius: character.border_radius,
        background: `linear-gradient(180deg, ${fillColorTop} 0%, ${fillColorBottom} 100%)`,
        borderColor: strokeColor,
        boxShadow: `0 16px 34px -28px ${shadowColor}, inset 0 1px 0 rgba(255,255,255,0.48)`,
        transform: `translate3d(${(translateX / character.width) * 100}%, ${(translateY / Math.max(character.height, 1)) * 100}%, 0) skewX(${skew + character.focus_skew * moodIntensity}deg)`,
      }}
    >
      {[0, 1].map((eyeIndex) => {
        const key = `${character.id}-${eyeIndex}`;
        const baseLeft =
          eyeLeftPercent +
          ((character.eye_size + character.eye_gap) / character.width) * 100 * eyeIndex;
        const eyeCommonStyle = {
          left: `calc(${baseLeft}% + ${eyeShiftXPercent}%)`,
          top: `calc(${eyeTopPercent}% + ${eyeShiftYPercent}%)`,
          width: `${eyeWidthPercent}%`,
        };

        if (!showOpenEyes || isBlinking) {
          return (
            <div
              key={key}
              className="home-characters-feature__eye-rest"
              style={{
                ...eyeCommonStyle,
                height: `${closedEyeHeight}%`,
                background: detailColor,
              }}
            />
          );
        }

        if (character.eye_style === 'eyeball') {
          return (
            <div
              key={key}
              className="home-characters-feature__eye-ball"
              style={{
                ...eyeCommonStyle,
                height: `${eyeHeightPercent}%`,
                background: character.eye_color,
                borderColor: hexToRgba(character.background, 0.26),
              }}
            >
              <div
                className="home-characters-feature__eye-pupil"
                style={{
                  width: `${(character.pupil_size / character.eye_size) * 100}%`,
                  height: `${(character.pupil_size / character.eye_size) * 100}%`,
                  background: detailColor,
                  transform: `translate(${pupilShiftXPercent}%, ${pupilShiftYPercent}%)`,
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={key}
            className="home-characters-feature__pupil-only"
            style={{
              ...eyeCommonStyle,
              height: `${eyeHeightPercent}%`,
              background: detailColor,
              transform: `translate(${pupilShiftXPercent}%, ${pupilShiftYPercent}%)`,
            }}
          />
        );
      })}

      {hasMouth ? (
        <div
          className="home-characters-feature__mouth"
          style={{
            left: `${((character.mouth_left as number) / character.width) * 100}%`,
            top: `${((character.mouth_top as number) / character.height) * 100}%`,
            width: `${((character.mouth_width as number) / character.width) * 100}%`,
            height: `${(character.mouth_height / character.height) * 100}%`,
            background: detailColor,
          }}
        />
      ) : null}
    </div>
  );
};
