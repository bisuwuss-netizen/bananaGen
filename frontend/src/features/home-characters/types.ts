export interface HomeCharacterConfig {
  id: string;
  shape: 'block' | 'rounded_block' | 'arch';
  width: number;
  height: number;
  left: number;
  bottom: number;
  layer: number;
  background: string;
  border_radius: string;
  eye_style: 'eyeball' | 'pupil';
  eye_top: number;
  eye_left: number;
  eye_gap: number;
  eye_size: number;
  pupil_size: number;
  eye_color: string;
  pupil_color: string;
  mouth_top?: number | null;
  mouth_left?: number | null;
  mouth_width?: number | null;
  mouth_height: number;
  max_face_x: number;
  max_face_y: number;
  max_skew: number;
  face_x_factor: number;
  face_y_factor: number;
  skew_factor: number;
  focus_shift_x: number;
  focus_shift_y: number;
  focus_skew: number;
  focus_height_delta: number;
  ready_shift_y: number;
  blink_enabled: boolean;
}

export interface HomeCharactersConfig {
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
  scene_width: number;
  scene_height: number;
  floor_height: number;
  chips: string[];
  characters: HomeCharacterConfig[];
}

export interface HomeCharactersApiPayload {
  config: HomeCharactersConfig;
}

export interface PointerState {
  x: number;
  y: number;
}

export type HomeCharactersMood = 'idle' | 'ready' | 'engaged';

export interface PromptMetrics {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CharacterLayoutOverride {
  left: number;
  top: number;
  width: number;
  height: number;
}
