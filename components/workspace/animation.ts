import { AnimationKeyframe } from '../../types';
import { interpolateColor } from './utils';

export const interpolateKeyframes = (
  keyframes: AnimationKeyframe[],
  input: number
): number | string => {
  const sorted = [...keyframes].sort((a, b) => a.offset - b.offset);
  if (sorted.length === 0) return 0;

  const firstVal = sorted[0].value;
  if (typeof firstVal === 'string') {
    if (input <= sorted[0].offset) return firstVal;
    if (input >= sorted[sorted.length - 1].offset) {
      return sorted[sorted.length - 1].value;
    }

    if (firstVal.startsWith('#')) {
      for (let i = 0; i < sorted.length - 1; i++) {
        if (input >= sorted[i].offset && input <= sorted[i + 1].offset) {
          const range = sorted[i + 1].offset - sorted[i].offset || 1;
          const t = (input - sorted[i].offset) / range;
          return interpolateColor(
            String(sorted[i].value),
            String(sorted[i + 1].value),
            t
          );
        }
      }
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const threshold = current.offset + (next.offset - current.offset) / 2;
      if (input < threshold) {
        return current.value;
      }
    }
    return sorted[sorted.length - 1].value;
  }

  if (sorted.length === 1) return sorted[0].value;
  if (input <= sorted[0].offset) return sorted[0].value;
  if (input >= sorted[sorted.length - 1].offset) {
    return sorted[sorted.length - 1].value;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    if (input >= sorted[i].offset && input <= sorted[i + 1].offset) {
      const range = sorted[i + 1].offset - sorted[i].offset || 1;
      const t = (input - sorted[i].offset) / range;
      const startVal = sorted[i].value as number;
      const endVal = sorted[i + 1].value as number;
      return startVal + t * (endVal - startVal);
    }
  }

  return 0;
};
