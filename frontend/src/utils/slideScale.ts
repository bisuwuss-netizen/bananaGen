export function getScaleToFit(
  containerWidth: number,
  containerHeight: number,
  slideWidth: number,
  slideHeight: number
): number {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(slideWidth) ||
    !Number.isFinite(slideHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    slideWidth <= 0 ||
    slideHeight <= 0
  ) {
    return 0;
  }

  return Math.min(containerWidth / slideWidth, containerHeight / slideHeight, 1);
}

export function getWidthFitScale(containerWidth: number, slideWidth: number): number {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(slideWidth) ||
    containerWidth <= 0 ||
    slideWidth <= 0
  ) {
    return 0;
  }

  return Math.min(containerWidth / slideWidth, 1);
}
