export interface Fit {
  devicePerPixel: number;
  cssWidth: number;
  cssHeight: number;
  /** CSS pixels per game pixel, for turning taps into tiles. */
  cssPerPixel: number;
}

/** The largest whole number of device pixels per game pixel that fits the space. */
export function fitScale(viewW: number, viewH: number, dpr: number, logW: number, logH: number): Fit {
  const devicePerPixel = Math.max(1, Math.floor(Math.min((viewW * dpr) / logW, (viewH * dpr) / logH)));
  const cssPerPixel = devicePerPixel / dpr;
  return { devicePerPixel, cssPerPixel, cssWidth: logW * cssPerPixel, cssHeight: logH * cssPerPixel };
}

export function tileAt(cssX: number, cssY: number, cssPerPixel: number, tile: number): { x: number; y: number } {
  return { x: Math.floor(cssX / cssPerPixel / tile), y: Math.floor(cssY / cssPerPixel / tile) };
}
