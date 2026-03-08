export interface LayoutVariantLike {
  variant?: string;
  layout_variant?: string;
}

export const isLayoutVariantB = (model?: LayoutVariantLike | null): boolean =>
  String(model?.layout_variant || model?.variant || 'a').toLowerCase() === 'b';
