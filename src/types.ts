/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Particle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  isAnchor: boolean;
}

export interface LightPreset {
  id: string;
  name: string;
  color: string;      // RGB string for the rope core (e.g. "rgb(255, 255, 255)")
  glowColor: string;  // Glow color (e.g. "rgba(255, 170, 80, 0.6)")
  shadowColor: string; // Shadow / ambient color (e.g. "#ffaa50")
  bgGlowClass: string; // Tailwind class for background container ambiance
}

export interface SimulationConfig {
  ropeLength: number;   // in feet (5 to 10)
  barLength: number;    // in feet (10 to 25)
  barHeight: number;    // mounting height of metal bar in feet (5.5 to 7.5, default 6.5)
  brightness: number;   // 0 to 300 * ropeLength
  colorPresetId: string; // active light preset ID
  gravity: number;      // gravity strength
  stiffness: number;    // stiffness control (0 = limp, 1 = extremely stiff)
  customHue?: number;   // active custom rainbow hue (0 to 360)
  wrapCount: number;    // number of times rope wraps around the bar (2 to 5, default 3)
}
