export interface LayoutVariantLike {
  variant?: unknown;
  layout_variant?: unknown;
}

export const isLayoutVariantB = (model?: object | null): boolean => {
  const candidate = model as LayoutVariantLike | null | undefined;
  return String(candidate?.layout_variant ?? candidate?.variant ?? 'a').toLowerCase() === 'b';
};
