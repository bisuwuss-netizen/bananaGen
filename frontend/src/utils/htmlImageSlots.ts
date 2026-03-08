import type { LayoutId } from '@/types';

export type HtmlImageSlotRole = 'main' | 'left' | 'right' | 'background';

export interface HtmlImageSlotDescriptor {
  slotPath: string;
  slotRole: HtmlImageSlotRole;
  src: string;
}

interface CollectHtmlImageSlotDescriptorsOptions {
  optionalImageEnabled?: boolean;
  inferTwoColumnPartType: (
    part: Record<string, unknown> | undefined
  ) => 'text' | 'image' | 'bullets';
  variantId?: string;
}

const PLACEHOLDER_IMAGE_SOURCE_RE = /^https?:\/\/(?:[\w-]+\.)*example\.(?:com|org|net)(?:[/?#:]|$)/i;

const IMAGE_URL_FIELD_NAMES = new Set(['background_image', 'hero_image', 'image_src']);

export const isPlaceholderImageSource = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  return PLACEHOLDER_IMAGE_SOURCE_RE.test(text);
};

export const normalizeImageSource = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || isPlaceholderImageSource(text)) {
    return '';
  }
  return text;
};

export const sanitizeHtmlModelImageSources = <T>(model: T): T => {
  const visit = (value: unknown, key?: string, parentKey?: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const cloned: Record<string, unknown> = {};
      Object.entries(record).forEach(([childKey, childValue]) => {
        cloned[childKey] = visit(childValue, childKey, key);
      });
      return cloned;
    }

    const shouldNormalize =
      IMAGE_URL_FIELD_NAMES.has(key || '')
      || (key === 'src' && parentKey === 'image');

    if (!shouldNormalize) {
      return value;
    }

    return normalizeImageSource(value);
  };

  return visit(model) as T;
};

export const collectHtmlImageSlotDescriptors = (
  layoutId: LayoutId,
  model: Record<string, any>,
  options: CollectHtmlImageSlotDescriptorsOptions
): HtmlImageSlotDescriptor[] => {
  const descriptors: HtmlImageSlotDescriptor[] = [];
  const variantId = String(options.variantId || model?.layout_variant || model?.variant || 'a').trim().toLowerCase();

  const push = (
    slotPath: string,
    src: unknown,
    slotRole: HtmlImageSlotRole = 'main'
  ) => {
    descriptors.push({
      slotPath,
      slotRole,
      src: normalizeImageSource(src),
    });
  };

  switch (layoutId) {
    case 'edu_cover':
      if (variantId !== 'b') {
        push('hero_image', model?.hero_image, 'main');
      }
      break;
    case 'cover':
      push('background_image', model?.background_image, 'background');
      break;
    case 'image_full':
    case 'detail_zoom':
      push('image_src', model?.image_src, 'main');
      break;
    case 'two_column':
    case 'vocational_comparison': {
      const left = model?.left as Record<string, unknown> | undefined;
      const right = model?.right as Record<string, unknown> | undefined;
      if (options.inferTwoColumnPartType(left) === 'image') {
        push('left.image_src', left?.image_src, 'left');
      }
      if (options.inferTwoColumnPartType(right) === 'image') {
        push('right.image_src', right?.image_src, 'right');
      }
      break;
    }
    case 'title_content':
    case 'vocational_content':
    case 'title_bullets':
    case 'process_steps':
      if (options.optionalImageEnabled) {
        push('image.src', model?.image?.src, 'main');
      }
      break;
    case 'portfolio': {
      const items = Array.isArray(model?.items) ? model.items : [];
      items.forEach((item: Record<string, unknown>, index: number) => {
        push(`items.${index}.image_src`, item?.image_src, 'main');
      });
      break;
    }
    default:
      break;
  }

  return descriptors;
};
