import type { CSSProperties } from 'react';

export type CornerRadii = {radius?:number;radiusTopLeft?:number;radiusTopRight?:number;radiusBottomRight?:number;radiusBottomLeft?:number};
/** An omitted corner follows the shared radius, preserving existing documents. */
export function cornerRadiusStyle(value:CornerRadii={},fallback?:number):CSSProperties {
  return {
    borderTopLeftRadius:value.radiusTopLeft??value.radius??fallback,
    borderTopRightRadius:value.radiusTopRight??value.radius??fallback,
    borderBottomRightRadius:value.radiusBottomRight??value.radius??fallback,
    borderBottomLeftRadius:value.radiusBottomLeft??value.radius??fallback,
  };
}
