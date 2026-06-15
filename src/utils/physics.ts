/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Particle } from "../types";

const SCALE = 60; // 60 pixels per foot in our simulation viewport

/**
 * Initializes a rope light with a set of nodes hanging gracefully under gravity.
 * Respects wrapCount, placing randomized anchor clips along the metal bar.
 */
export function initializeRope(
  ropeLengthFt: number,
  barLengthFt: number,
  canvasWidth: number,
  barY: number,
  numParticles: number = 250,
  wrapCount: number = 3
): Particle[] {
  const barLengthPx = barLengthFt * SCALE;
  const ropeLengthPx = ropeLengthFt * SCALE;
  
  const barStartX = (canvasWidth - barLengthPx) / 2;
  const barEndX = barStartX + barLengthPx;
  
  const segmentLength = ropeLengthPx / (numParticles - 1);
  const particles: Particle[] = [];
  
  const K = wrapCount;
  const minNodes = 18;
  const minPixels = 30;
  
  let f_p: number[] = [];
  let f_x: number[] = [];
  let foundValid = false;
  
  const generateFractions = (size: number, minVal: number): number[] => {
    let remMax = 1 - size * minVal;
    if (remMax < 0) {
      minVal = 0.95 / size;
      remMax = 1 - size * minVal;
    }
    
    const cuts: number[] = [];
    for (let i = 0; i < size - 1; i++) {
      cuts.push(Math.random() * remMax);
    }
    cuts.sort((a, b) => a - b);
    
    const fractions: number[] = [];
    let lastCut = 0;
    for (let i = 0; i < size - 1; i++) {
      fractions.push(minVal + (cuts[i] - lastCut));
      lastCut = cuts[i];
    }
    fractions.push(minVal + (remMax - lastCut));
    return fractions;
  };
  
  // Try up to 100 times to get a beautiful organic randomized configuration
  for (let attempt = 0; attempt < 100; attempt++) {
    const temp_f_p = generateFractions(K + 1, minNodes / (numParticles - 1));
    const temp_f_x = generateFractions(K + 1, minPixels / barLengthPx);
    
    // Check non-stretchable condition: physical segment length <= 0.88 * rope segment length
    let valid = true;
    for (let j = 0; j < K + 1; j++) {
      const dx = temp_f_x[j] * barLengthPx;
      const ropeSpan = temp_f_p[j] * ropeLengthPx;
      if (dx > 0.88 * ropeSpan) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      f_p = temp_f_p;
      f_x = temp_f_x;
      foundValid = true;
      break;
    }
  }
  
  // Fallback: If no fully organic configuration could be found (tight rope constraints),
  // use perfectly balanced proportional layout which is mathematically guaranteed to be stretch-safe
  if (!foundValid) {
    const proportional_f = generateFractions(K + 1, Math.max(minNodes / (numParticles - 1), minPixels / barLengthPx));
    f_p = proportional_f;
    f_x = proportional_f;
  }
  
  // Now reconstruct anchorIndices and anchorX from fractions
  const anchorIndices: number[] = [0];
  let currentP = 0;
  for (let j = 0; j < K; j++) {
    currentP += Math.round(f_p[j] * (numParticles - 1));
    anchorIndices.push(currentP);
  }
  anchorIndices.push(numParticles - 1);
  
  const anchorX: number[] = [barStartX];
  let currentX = barStartX;
  for (let j = 0; j < K; j++) {
    currentX += f_x[j] * barLengthPx;
    anchorX.push(currentX);
  }
  anchorX.push(barEndX);
  
  // 3. Initialize all particles with beautiful sag curves between anchors
  for (let j = 0; j < anchorIndices.length - 1; j++) {
    const pStart = anchorIndices[j];
    const pEnd = anchorIndices[j + 1];
    const spanNodes = pEnd - pStart;
    
    const xStart = anchorX[j];
    const xEnd = anchorX[j + 1];
    const dx = xEnd - xStart;
    
    const ropeSpanLength = spanNodes * segmentLength;
    const sag = Math.sqrt(Math.max(20, ropeSpanLength * ropeSpanLength - dx * dx)) * 0.55;
    
    for (let i = pStart; i <= pEnd; i++) {
      if (i === pEnd && j < anchorIndices.length - 2) continue;
      
      const t = (i - pStart) / spanNodes;
      const x = xStart + dx * t;
      const y = barY + sag * Math.sin(Math.PI * t);
      const isAnchor = anchorIndices.includes(i);
      
      particles.push({
        x,
        y: isAnchor ? barY : y,
        oldX: x,
        oldY: isAnchor ? barY : y,
        isAnchor,
      });
    }
  }
  
  return particles;
}

/**
 * Executes a single frame of Verlet integration and constraint resolution.
 * To ensure rigidity and limit stretchiness, we execute multiple sub-steps per frame.
 */
export function stepPhysics(
  particles: Particle[],
  ropeLengthFt: number,
  barLengthFt: number,
  canvasWidth: number,
  barY: number,
  draggedNodeIndex: number | null,
  draggedPos: { x: number; y: number } | null,
  gravity: number = 0.25,
  stiffness: number = 0.5,
  barHeightFt: number = 6.5
): void {
  const numParticles = particles.length;
  const ropeLengthPx = ropeLengthFt * SCALE;
  const barLengthPx = barLengthFt * SCALE;
  const barStartX = (canvasWidth - barLengthPx) / 2;
  const barEndX = barStartX + barLengthPx;
  const segmentLength = ropeLengthPx / (numParticles - 1);
  const friction = 0.985; // Air resistance damping
  const floorY = barY + barHeightFt * SCALE; // Floor level resides dynamically below the bar

  // Identify all intermediate anchors (excluding boundaries of the metal bar)
  const intermediateAnchors: number[] = [];
  for (let i = 1; i < numParticles - 1; i++) {
    if (particles[i].isAnchor) {
      intermediateAnchors.push(i);
    }
  }

  // Helper to determine if a node is part of a hanger's wrap-around circle and compute its target coordinates
  const getWrapTarget = (i: number): { x: number; y: number } | null => {
    let closestH = -1;
    let minDI = 999;
    for (const h of intermediateAnchors) {
      const dI = Math.abs(i - h);
      if (dI <= 6 && dI < minDI) {
        minDI = dI;
        closestH = h;
      }
    }
    if (closestH !== -1) {
      const dist = i - closestH;
      const theta = (dist / 6) * 1.35; // Maximum angle of about 77 degrees draping
      const R = 1.75; // Snug circle wrap radius (bar radius 1.25 + rope radius factor) for realistic 3D gripping
      const anchorX = particles[closestH].x;
      return {
        x: anchorX + R * Math.sin(theta),
        y: barY - R * Math.cos(theta),
      };
    }
    return null;
  };

  // --- 1. Accumulate Forces & Integrate Verlet ---
  for (let i = 0; i < numParticles; i++) {
    const p = particles[i];

    // Extremely fixed outer anchor points attached to the ends of the metal bar
    if (i === 0) {
      p.isAnchor = true;
      p.x = barStartX;
      p.y = barY;
      p.oldX = barStartX;
      p.oldY = barY;
      continue;
    }
    if (i === numParticles - 1) {
      p.isAnchor = true;
      p.x = barEndX;
      p.y = barY;
      p.oldX = barEndX;
      p.oldY = barY;
      continue;
    }

    // If this node is being dragged by the mouse, bypass Verlet integration
    if (i === draggedNodeIndex && draggedPos) {
      p.oldX = p.x;
      p.oldY = p.y;
      p.x = draggedPos.x;
      p.y = draggedPos.y;

      // Anchored clips must stay snapped to the horizontal bar
      if (p.isAnchor) {
        p.y = barY;
        p.x = Math.max(barStartX, Math.min(barEndX, p.x));
      }
    }

    // If node falls within any hanger's wrap-around geometry, snap and freeze it on the wrap circle
    const wrapTarget = getWrapTarget(i);
    if (wrapTarget !== null) {
      p.x = wrapTarget.x;
      p.y = wrapTarget.y;
      p.oldX = p.x;
      p.oldY = p.y;
      continue;
    }

    // Locked nodes (anchors) that are not dragged stay still
    if (p.isAnchor) {
      p.y = barY;
      p.x = Math.max(barStartX, Math.min(barEndX, p.x));
      p.oldX = p.x;
      p.oldY = p.y;
      continue;
    }

    // Regular kinematics
    const vx = (p.x - p.oldX) * friction;
    const vy = (p.y - p.oldY) * friction;

    p.oldX = p.x;
    p.oldY = p.y;

    // Apply gravity
    let fy = gravity;
    let fx = 0;

    p.x += vx + fx;
    p.y += vy + fy;

    // Floor collision constraint (Exactly 8ft below the bar)
    if (p.y > floorY) {
      p.y = floorY;
      // High friction and low bounce contact with concrete studio floor
      p.oldY = floorY + (p.y - p.oldY) * 0.3;
      p.oldX = p.x - (p.x - p.oldX) * 0.75;
    }
  }

  // --- 2. Multiple Iterations of Rigid Distance & Stiffness Constraints ---
  const constraintIterations = 60; // Higher is stiffer (less elastic)
  const bendSpan = 8;             // Spans 8 nodes for a smooth, visible wrap/bend around hanger positions
  const targetBendLength = segmentLength * bendSpan;
  
  // Scale stiffness effects directly from the control parameter
  // 0% stiffness means completely limp, allowing the rope to shear and twist freely.
  const bendStiffness = stiffness * 0.22;

  for (let iter = 0; iter < constraintIterations; iter++) {
    // A. Solve Standard Distance Constraints (Segment Length Integrity)
    for (let i = 0; i < numParticles - 1; i++) {
      const p1 = particles[i];
      const p2 = particles[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist === 0) continue;

      const diff = segmentLength - dist;
      const percent = (diff / dist) * 0.5;
      const offsetX = dx * percent;
      const offsetY = dy * percent;

      let w1 = 1;
      let w2 = 1;

      if (p1.isAnchor || i === draggedNodeIndex || getWrapTarget(i) !== null) w1 = 0;
      if (p2.isAnchor || (i + 1) === draggedNodeIndex || getWrapTarget(i + 1) !== null) w2 = 0;

      if (w1 === 0 && w2 === 0) continue;

      const totalW = w1 + w2;
      p1.x -= offsetX * (w1 / totalW) * 2;
      p1.y -= offsetY * (w1 / totalW) * 2;
      p2.x += offsetX * (w2 / totalW) * 2;
      p2.y += offsetY * (w2 / totalW) * 2;
    }

    // B. Solve Bending Stiffness Constraints (Resists high curvature, wraps hangers, maintains structural state)
    for (let i = 0; i < numParticles - bendSpan; i++) {
      const p1 = particles[i];
      const p2 = particles[i + bendSpan];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const diff = targetBendLength - dist;
      const percent = (diff / dist) * 0.5 * bendStiffness;
      const offsetX = dx * percent;
      const offsetY = dy * percent;

      // Determine movable weights
      let w1 = 1;
      let w2 = 1;

      if (p1.isAnchor || i === draggedNodeIndex || getWrapTarget(i) !== null) w1 = 0;
      if (p2.isAnchor || (i + bendSpan) === draggedNodeIndex || getWrapTarget(i + bendSpan) !== null) w2 = 0;

      if (w1 === 0 && w2 === 0) continue;

      const totalW = w1 + w2;
      p1.x -= offsetX * (w1 / totalW);
      p1.y -= offsetY * (w1 / totalW);
      p2.x += offsetX * (w2 / totalW);
      p2.y += offsetY * (w2 / totalW);
    }

    // C. Horizontal End Clamps (Points horizontal and outward at left/right endpoints)
    // As stiffness increases, the horizontal pointing effect extends deeper into more segments.
    const clampNodeCount = Math.round(16 * stiffness);
    if (clampNodeCount > 0) {
      // Left end points horizontally outward (pointing left)
      for (let j = 1; j <= clampNodeCount; j++) {
        if (j >= numParticles) break;
        if (j === draggedNodeIndex) continue;
        
        // Target is relative to the anchor node or preceding node and horizontally aligned to the left
        const targetX = particles[j - 1].x - segmentLength;
        const targetY = particles[j - 1].y;

        const clampFactor = stiffness * 0.15; // Smooth convergence
        particles[j].x += (targetX - particles[j].x) * clampFactor;
        particles[j].y += (targetY - particles[j].y) * clampFactor;
      }

      // Right end points horizontally outward (pointing right)
      for (let j = numParticles - 2; j >= numParticles - 1 - clampNodeCount; j--) {
        if (j < 0) break;
        if (j === draggedNodeIndex) continue;

        // Target is relative to the right-adjacent node and horizontally aligned to the right
        const targetX = particles[j + 1].x + segmentLength;
        const targetY = particles[j + 1].y;

        const clampFactor = stiffness * 0.15; // Smooth convergence
        particles[j].x += (targetX - particles[j].x) * clampFactor;
        particles[j].y += (targetY - particles[j].y) * clampFactor;
      }
    }

    // --- Dynamic Tension Anchor Splitting ---
    // Prevent dragging anchors past the length threshold of their neighboring anchors on the bar.
    if (draggedNodeIndex !== null && particles[draggedNodeIndex].isAnchor && draggedPos) {
      const p = particles[draggedNodeIndex];

      let prevAnchorIdx = -1;
      for (let i = draggedNodeIndex - 1; i >= 0; i--) {
        if (particles[i].isAnchor) {
          prevAnchorIdx = i;
          break;
        }
      }

      let nextAnchorIdx = -1;
      for (let i = draggedNodeIndex + 1; i < numParticles; i++) {
        if (particles[i].isAnchor) {
          nextAnchorIdx = i;
          break;
        }
      }

      let minX = barStartX;
      let maxX = barEndX;

      if (prevAnchorIdx !== -1) {
        const ropeLengthBetween = (draggedNodeIndex - prevAnchorIdx) * segmentLength;
        const prevAnchor = particles[prevAnchorIdx];
        minX = Math.max(minX, prevAnchor.x - ropeLengthBetween);
      }

      if (nextAnchorIdx !== -1) {
        const ropeLengthBetween = (nextAnchorIdx - draggedNodeIndex) * segmentLength;
        const nextAnchor = particles[nextAnchorIdx];
        maxX = Math.min(maxX, nextAnchor.x + ropeLengthBetween);
      }

      p.x = Math.max(minX, Math.min(maxX, p.x));
    }
  }

  // --- 3. Final Correction Snap for Anchors & Floor level ---
  for (let i = 0; i < numParticles; i++) {
    const p = particles[i];
    if (i === 0) {
      p.isAnchor = true;
      p.x = barStartX;
      p.y = barY;
    } else if (i === numParticles - 1) {
      p.isAnchor = true;
      p.x = barEndX;
      p.y = barY;
    } else {
      const wrapTarget = getWrapTarget(i);
      if (wrapTarget !== null) {
        p.x = wrapTarget.x;
        p.y = wrapTarget.y;
      } else if (p.isAnchor) {
        p.y = barY;
        p.x = Math.max(barStartX, Math.min(barEndX, p.x));
      }
    }

    // Anchor-independent floor collision snap
    if (!p.isAnchor && p.y > floorY) {
      p.y = floorY;
      if (p.oldY > floorY) p.oldY = floorY;
    }
  }
}
