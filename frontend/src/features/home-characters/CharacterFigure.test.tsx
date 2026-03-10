import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HomeCharacterConfig } from './types';
import { CharacterFigure } from './components/CharacterFigure';

const baseCharacter: HomeCharacterConfig = {
  id: 'purple-editor',
  shape: 'block',
  width: 126,
  height: 172,
  left: 78,
  bottom: 224,
  layer: 1,
  background: '#8770e2',
  border_radius: '22px 22px 16px 16px',
  eye_style: 'eyeball',
  eye_top: 34,
  eye_left: 39,
  eye_gap: 20,
  eye_size: 14,
  pupil_size: 5,
  eye_color: 'white',
  pupil_color: '#595463',
  mouth_height: 4,
  max_face_x: 10,
  max_face_y: 8,
  max_skew: 4.5,
  face_x_factor: 0.8,
  face_y_factor: 0.8,
  skew_factor: 0.7,
  focus_shift_x: 2,
  focus_shift_y: 2,
  focus_skew: -4.2,
  focus_height_delta: 8,
  ready_shift_y: 0,
  blink_enabled: true,
};

describe('CharacterFigure', () => {
  it('keeps visible open eyes in idle mood for eyeball characters', () => {
    const { container } = render(
      <CharacterFigure
        character={baseCharacter}
        sceneWidth={1000}
        sceneHeight={340}
        pointer={{ x: 0, y: 0 }}
        mood="idle"
        motionEnabled={false}
      />
    );

    expect(container.querySelectorAll('.home-characters-feature__eye-ball')).toHaveLength(2);
  });

  it('supports fixed pixel layout overrides so size does not depend on scene height', () => {
    const { getByTestId } = render(
      <CharacterFigure
        character={baseCharacter}
        sceneWidth={1000}
        sceneHeight={340}
        pointer={{ x: 0, y: 0 }}
        mood="ready"
        motionEnabled={false}
        layoutOverride={{
          left: 24,
          top: 32,
          width: 126,
          height: 172,
        }}
      />
    );

    const figure = getByTestId('home-character-figure');

    expect(figure).toHaveStyle({
      left: '24px',
      top: '32px',
      width: '126px',
      height: '172px',
    });
  });
});
