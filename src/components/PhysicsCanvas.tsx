/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Particle, SimulationConfig, LightPreset } from "../types";
import { initializeRope, stepPhysics } from "../utils/physics";
import { Hammer, Anchor, RefreshCw } from "lucide-react";

interface PhysicsCanvasProps {
  config: SimulationConfig;
  presets: LightPreset[];
  activePreset: LightPreset;
  resetTrigger: number;
  onClipCountChange: (count: number) => void;
  onTemporaryStatus: (status: string) => void;
}

const FLOOR_Y = 640; // Y height representing the static floor level (0 ft)
const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 720;
const SCALE = 60; // pixels per foot

export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  config,
  presets,
  activePreset,
  resetTrigger,
  onClipCountChange,
  onTemporaryStatus,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const draggedNodeIndexRef = useRef<number | null>(null);
  const draggedPosRef = useRef<{ x: number; y: number } | null>(null);
  const animeFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // States for tracking user hover on canvas
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
  const [isNearBarHover, setIsNearBarHover] = useState<{ x: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const justAddedHangerRef = useRef<boolean>(false);

  // Touch tracking refs for pinch zoom and gesture dragging
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef<boolean>(false);

  // A helper to determine if a node index is a wrapped side-node of an active hanger
  const isWrappedNode = (idx: number): boolean => {
    const numP = particlesRef.current.length;
    if (idx <= 0 || idx >= numP - 1) return false;
    
    for (let i = 1; i < numP - 1; i++) {
       if (particlesRef.current[i]?.isAnchor) {
         const diff = Math.abs(idx - i);
         if (diff > 0 && diff <= 6) {
           return true;
         }
       }
    }
    return false;
  };

  // Native wheel listener on the canvas with { passive: false } to support clean scrolling zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.0012;
      setZoom((prev) => {
        const nextZoom = Math.max(0.5, Math.min(4.0, prev + zoomDelta));
        setTimeout(() => {
          onTemporaryStatus(`Scale viewport zoom: ${Math.round(nextZoom * 100)}%`);
        }, 0);
        return nextZoom;
      });
    };

    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleCanvasWheel);
    };
  }, []);

  // Re-initialize physics when lengths are configured or when reset triggers
  useEffect(() => {
    const barY = FLOOR_Y - config.barHeight * SCALE;
    particlesRef.current = initializeRope(
      config.ropeLength,
      config.barLength,
      LOGICAL_WIDTH,
      barY,
      250,
      config.wrapCount
    );
    const count = particlesRef.current.filter((p) => p.isAnchor).length;
    setTimeout(() => {
      onClipCountChange(count);
      onTemporaryStatus(`Hydro-structured layout randomly reset with exactly ${count} wrap-arounds`);
    }, 0);
  }, [config.ropeLength, config.barLength, config.wrapCount, config.barHeight, resetTrigger]);

  // Adjust clip count dynamically if we add or delete clips
  const syncClipCount = () => {
    const clips = particlesRef.current.filter((p) => p.isAnchor).length;
    setTimeout(() => {
      onClipCountChange(clips);
    }, 0);
  };

  // Main high-performance render and physics simulation step
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI physical backing resolution for ultimate visual crispness
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * dpr;
    canvas.height = LOGICAL_HEIGHT * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    const runLoop = () => {
      timeRef.current += 1;

      const barY = FLOOR_Y - config.barHeight * SCALE;

      // 1. Advance Physics Engine
      stepPhysics(
        particlesRef.current,
        config.ropeLength,
        config.barLength,
        LOGICAL_WIDTH,
        barY,
        draggedNodeIndexRef.current,
        draggedPosRef.current,
        config.gravity,
        config.stiffness,
        config.barHeight
      );

      // 2. Render Loop
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      ctx.save();
      const cx = LOGICAL_WIDTH / 2;
      const cy = LOGICAL_HEIGHT / 2;
      ctx.translate(cx + panX, cy + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      // Creates a stunning visual ambiance responsive to the brightness slider
      const barLengthPx = config.barLength * SCALE;
      const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
      const barEndX = barStartX + barLengthPx;
      const maxBrightness = 300 * config.ropeLength;
      const normalizedBrightness = config.brightness / maxBrightness; // 0 to 1
      const numParticles = particlesRef.current.length;

      // Render radial glow from center of the bar to illuminate the "wall"
      if (normalizedBrightness > 0) {
        const radGlow = ctx.createRadialGradient(
          LOGICAL_WIDTH / 2,
          barY + 100,
          20,
          LOGICAL_WIDTH / 2,
          barY + 120,
          320
        );
        const intensity = normalizedBrightness * 0.45;
        radGlow.addColorStop(0, activePreset.glowColor.replace(/[\d.]+\)$/, `${intensity})`));
        radGlow.addColorStop(0.5, activePreset.glowColor.replace(/[\d.]+\)$/, `${intensity * 0.3})`));
        radGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = radGlow;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      }

      const floorY = FLOOR_Y;

      // Draw elegant studio architectural grid
      const gridSize = 60; // 1ft = 60px scale
      // Vertical lines
      for (let x = 0; x < LOGICAL_WIDTH; x += gridSize) {
        const isMajor = Math.round(x / gridSize) % 5 === 0;
        if (isMajor) {
          ctx.setLineDash([1, 4]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 1.0;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 0.75;
        }
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      // Horizontal lines aligned to floorY (so a line always falls exactly on floorY)
      for (let y = floorY; y >= 0; y -= gridSize) {
        const ftIndex = Math.round((floorY - y) / gridSize);
        const isMajor = ftIndex % 5 === 0;
        if (isMajor) {
          ctx.setLineDash([1, 4]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 1.0;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 0.75;
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }
      for (let y = floorY + gridSize; y < LOGICAL_HEIGHT; y += gridSize) {
        const ftIndex = Math.round((y - floorY) / gridSize);
        const isMajor = ftIndex % 5 === 0;
        if (isMajor) {
          ctx.setLineDash([1, 4]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 1.0;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 0.75;
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash for subsequent UI elements

      // Draw elegant Floor Level (defined by config.barHeight below the bar)

      // 1. Fill ground background under floorY
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, LOGICAL_HEIGHT);
      floorGrad.addColorStop(0, "rgba(15, 23, 42, 0.35)");
      floorGrad.addColorStop(1, "rgba(2, 6, 23, 0.65)");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, LOGICAL_WIDTH, LOGICAL_HEIGHT - floorY);

      // 2. Solid floor line styling (concrete studio edge)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(LOGICAL_WIDTH, floorY);
      ctx.stroke();

      // 3. Highlight line on top of floor to give 3D depth
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, floorY - 0.5);
      ctx.lineTo(LOGICAL_WIDTH, floorY - 0.5);
      ctx.stroke();

      // 4. Floor Label
      ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
      ctx.font = "bold 8px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("0.0'", LOGICAL_WIDTH - 24, floorY + 11);

      // Height dimension line to show exactly dimension height
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(50, barY);
      ctx.lineTo(50, floorY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowheads or indicators for the dimension line
      ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
      // Top arrowhead
      ctx.beginPath();
      ctx.moveTo(47, barY + 6);
      ctx.lineTo(50, barY);
      ctx.lineTo(53, barY + 6);
      ctx.fill();
      // Bottom arrowhead
      ctx.beginPath();
      ctx.moveTo(47, floorY - 6);
      ctx.lineTo(50, floorY);
      ctx.lineTo(53, floorY - 6);
      ctx.fill();

      // Dimension text label along the line
      ctx.save();
      ctx.translate(42, (barY + floorY) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.font = "bold 8px -apple-system, system-ui, sans-serif";
      ctx.fillText(`${config.barHeight.toFixed(1)}'`, 0, 0);
      ctx.restore();

      // --- Draw Elegant Dining Table situated on the floor (30 in / 2.5 ft height above ground) ---
      const tableWidth = 400; // ~6.6 feet wide
      const tableHeight = 150; // exactly 30 inches tall (2.5 ft * 60 = 150px)
      const tableX = cx - tableWidth / 2;
      const tableY = floorY - tableHeight;
      const tableThickness = 12; // ~2.4 inches thick tabletop

      // 1. Soft ground shadow under the table
      const shadowGrad = ctx.createRadialGradient(cx, floorY, 10, cx, floorY, tableWidth * 0.6);
      shadowGrad.addColorStop(0, "rgba(2, 6, 23, 0.75)");
      shadowGrad.addColorStop(0.5, "rgba(2, 6, 23, 0.3)");
      shadowGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, floorY, tableWidth * 0.42, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Table steel leg assembly (Midnight custom raw iron leg design)
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)"; 
      
      // Left tapered modern leg
      ctx.beginPath();
      ctx.moveTo(tableX + 45, tableY + tableThickness);
      ctx.lineTo(tableX + 35, floorY);
      ctx.lineTo(tableX + 45, floorY);
      ctx.lineTo(tableX + 53, tableY + tableThickness);
      ctx.closePath();
      ctx.fill();

      // Right tapered modern leg
      ctx.beginPath();
      ctx.moveTo(tableX + tableWidth - 45, tableY + tableThickness);
      ctx.lineTo(tableX + tableWidth - 35, floorY);
      ctx.lineTo(tableX + tableWidth - 45, floorY);
      ctx.lineTo(tableX + tableWidth - 53, tableY + tableThickness);
      ctx.closePath();
      ctx.fill();

      // Horizontal central support brace
      ctx.strokeStyle = "rgba(30, 41, 59, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tableX + 40, floorY - 15);
      ctx.lineTo(tableX + tableWidth - 40, floorY - 15);
      ctx.stroke();

      // 3. Tabletop Solid Premium Walnut block
      const woodGrad = ctx.createLinearGradient(tableX, tableY, tableX + tableWidth, tableY);
      woodGrad.addColorStop(0, "#4a2c18"); 
      woodGrad.addColorStop(0.35, "#6b4226"); 
      woodGrad.addColorStop(0.5, "#56331b"); 
      woodGrad.addColorStop(0.65, "#6b4226"); 
      woodGrad.addColorStop(1, "#4a2c18"); 
      
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableWidth, tableThickness, [2, 2, 1, 1]);
      ctx.fill();

      // Crisp contrast outline
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableWidth, tableThickness, [2, 2, 1, 1]);
      ctx.stroke();

      // Tabletop Bevel trim edge reflection
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(tableX + 1, tableY + 0.5);
      ctx.lineTo(tableX + tableWidth - 1, tableY + 0.5);
      ctx.stroke();

      // 4. Real-time Responsive Light Projection overlay (tabletop luminous response)
      if (normalizedBrightness > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tableX + 0.5, tableY + 0.5, tableWidth - 1, tableThickness - 1, [1, 1, 0, 0]);
        ctx.clip();

        const tableReflection = ctx.createRadialGradient(
          cx, tableY, 2,
          cx, tableY, tableWidth * 0.65
        );
        tableReflection.addColorStop(0, activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.42})`));
        tableReflection.addColorStop(0.4, activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.16})`));
        tableReflection.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = tableReflection;
        ctx.fillRect(tableX, tableY, tableWidth, tableThickness);
        ctx.restore();
      }

      // Support Chains/Wires for the metal bar
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2.5;
      
      // Left bracket
      ctx.beginPath();
      ctx.moveTo(barStartX + 15, barY);
      ctx.lineTo(barStartX + 15, 0);
      ctx.stroke();
      
      // Right bracket
      ctx.beginPath();
      ctx.moveTo(barEndX - 15, barY);
      ctx.lineTo(barEndX - 15, 0);
      ctx.stroke();
      
      // Draw anchor pads for brackets on the bar
      ctx.fillStyle = "#2a2d35";
      ctx.beginPath();
      ctx.arc(barStartX + 15, barY, 2, 0, Math.PI * 2);
      ctx.arc(barEndX - 15, barY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Identify all intermediate anchors for 3D layering
      const intermediateAnchors = new Set<number>();
      particlesRef.current.forEach((p, idx) => {
        if (p.isAnchor && idx > 0 && idx < numParticles - 1) {
          intermediateAnchors.add(idx);
        }
      });

      // Helper to check if a segment index is behind the bar (under-half of the wrap)
      const isSegmentBehind = (idx: number): boolean => {
        for (const h of intermediateAnchors) {
          if (idx >= h && idx < h + 6) {
            return true;
          }
        }
        return false;
      };

      // Helper to build canvas paths either for front-facing or rear-facing segments
      const buildRopePath = (drawBehind: boolean) => {
        ctx.beginPath();
        let inPath = false;
        for (let i = 0; i < numParticles - 1; i++) {
          const isBehind = isSegmentBehind(i);
          if (isBehind === drawBehind) {
            const p1 = particlesRef.current[i];
            const p2 = particlesRef.current[i + 1];
            if (!inPath) {
              ctx.moveTo(p1.x, p1.y);
              inPath = true;
            }
            ctx.lineTo(p2.x, p2.y);
          } else {
            inPath = false;
          }
        }
      };

      // Helper to render standard multi-layer lighting effects with realistic light falloff
      const renderRopeLayer = (drawBehind: boolean) => {
        if (numParticles <= 1) return;

        if (normalizedBrightness > 0) {
          // Detect touch or mobile device to execute clean, hardware-accelerated multi-width strokes
          const isMobileDevice = typeof window !== "undefined" && (
            "ontouchstart" in window || 
            navigator.maxTouchPoints > 0 || 
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          );

          if (isMobileDevice) {
            // Highly optimized mobile rendering path avoiding CPU shadow blurs
            ctx.save();
            buildRopePath(drawBehind);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Broad Ambient Glow (simulates broad background bloom)
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.14})`);
            ctx.lineWidth = 26 + normalizedBrightness * 16;
            ctx.stroke();

            // Intermediary Volumetric Air Halo
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.32})`);
            ctx.lineWidth = 12 + normalizedBrightness * 8;
            ctx.stroke();

            // Soft Sleeve Corona (Immediate boundary edge glow)
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.55})`);
            ctx.lineWidth = 5.5 + normalizedBrightness * 3;
            ctx.stroke();

            // Core Neon Tube
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.96})`);
            ctx.lineWidth = 2.8;
            ctx.stroke();

            ctx.restore();
          } else {
            // High-fidelity desktop path with shadowBlur glow scattering
            // Layer 1: Outer Atmospheric Scatter (Broad, feather-soft background bloom)
            // By using a very thin line (1.2px) with a huge shadow blur, we get a beautiful Gaussian-like
            // soft glow decay across the wall instead of a thick solid tube with harsh edges.
            ctx.save();
            buildRopePath(drawBehind);
            ctx.shadowColor = activePreset.shadowColor;
            ctx.shadowBlur = 22 + normalizedBrightness * 32;
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.16})`);
            ctx.lineWidth = 1.2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
            ctx.restore();

            // Layer 2: Volumetric Air Halo (Medium transition zone)
            ctx.save();
            buildRopePath(drawBehind);
            ctx.shadowColor = activePreset.shadowColor;
            ctx.shadowBlur = 10 + normalizedBrightness * 14;
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.35})`);
            ctx.lineWidth = 2.0;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
            ctx.restore();

            // Layer 3: Silicone Sleeve Soft Corona (Immediate boundary glow)
            ctx.save();
            buildRopePath(drawBehind);
            ctx.shadowColor = activePreset.shadowColor;
            ctx.shadowBlur = 3 + normalizedBrightness * 5;
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.60})`);
            ctx.lineWidth = 2.5; 
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
            ctx.restore();

            // Layer 4: The Physical Diffuse Neon Tube Core (representing the translucent silicone casing)
            ctx.save();
            buildRopePath(drawBehind);
            ctx.strokeStyle = activePreset.glowColor.replace(/[\d.]+\)$/, `${normalizedBrightness * 0.96})`);
            ctx.lineWidth = 2.8; // Physical scale representing the 1.1" silicone diffuser extrusion
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // Off state: dark unlit copper/plastic wire (exactly 1" = 2.5px)
          ctx.save();
          buildRopePath(drawBehind);
          ctx.strokeStyle = "#272a30";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          ctx.restore();
        }

        // Layer 5 (Lit and Unlit): Central Hot Filament (High-intensity core line)
        ctx.save();
        buildRopePath(drawBehind);
        ctx.strokeStyle = normalizedBrightness > 0 ? activePreset.color : "#4b5563";
        ctx.lineWidth = 0.85;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      };

      // --- D1. Render Rope segments that wrap BEHIND the metal bar ---
      renderRopeLayer(true);

      // --- B. Draw Metal Bar (Suspension Rod) ---
      // Chrome/Metallic render using linear gradient
      const barGrad = ctx.createLinearGradient(0, barY - 1.5, 0, barY + 1.5);
      barGrad.addColorStop(0, "#1f2229");
      barGrad.addColorStop(0.2, "#4a505e");
      barGrad.addColorStop(0.5, "#d1d5db"); // shiny chrome peak highlight
      barGrad.addColorStop(0.8, "#6b7280");
      barGrad.addColorStop(1, "#111827");

      // Draw main cylinder (exactly 2.5px height = 1" diameter)
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barStartX, barY - 1.25, barLengthPx, 2.5, 0.5);
      ctx.fill();

      // Shiny silver caps at the rod ends
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.arc(barStartX, barY, 1.25, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(barEndX, barY, 1.25, (3 * Math.PI) / 2, Math.PI / 2);
      ctx.fill();

      // --- D2. Render Rope segments that pass in FRONT of the metal bar (including free-hanging drapes) ---
      renderRopeLayer(false);

      // --- B2. Draw subtle foot ticks and labels along the metal bar ---
      ctx.fillStyle = "rgba(156, 163, 175, 0.35)";
      ctx.strokeStyle = "rgba(156, 163, 175, 0.2)";
      ctx.font = "9px 'JetBrains Mono', Monaco, monospace";
      ctx.textAlign = "center";
      
      const feetCount = config.barLength;
      for (let f = 0; f <= feetCount; f++) {
        const xPos = barStartX + f * SCALE;
        
        ctx.beginPath();
        // Major tick on 5ft, minor tick others
        const isMajor = f % 5 === 0;
        const tickSize = isMajor ? 5 : 2.5;
        ctx.moveTo(xPos, barY - 1.25 - tickSize);
        ctx.lineTo(xPos, barY - 1.25);
        ctx.stroke();
        
        if (isMajor) {
          ctx.font = "bold 8px -apple-system, system-ui, sans-serif";
          ctx.fillText(`${f}'`, xPos, barY - 10);
        }
      }

      // --- C. Draw Adding Hanger Indicator Overlay ---
      // Visualizer telling user we can click to add clip
      if (isNearBarHover && !draggedNodeIndexRef.current) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(isNearBarHover.x, barY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = activePreset.shadowColor;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // --- E. Draw Hanger Clips (Sliding Anchor Rings) ---
        particlesRef.current.forEach((p, idx) => {
          if (p.isAnchor) {
            const isUnderHover = idx === hoveredNodeIndex;
            const isBeingDragged = idx === draggedNodeIndexRef.current;

            // Hanger clips are completely invisible. Only draw a subtle glow spot when hovered or dragged
            // to maintain intuitive interactivity and discoverability.
            if (isUnderHover || isBeingDragged) {
              ctx.save();
              ctx.fillStyle = activePreset.color;
              ctx.shadowColor = activePreset.shadowColor;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          } else {
            // If regular node is hovered, draw tiny grab pulse
            if (idx === hoveredNodeIndex) {
              ctx.fillStyle = activePreset.color;
              ctx.shadowColor = activePreset.shadowColor;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0; // reset
            }
          }
        });

      ctx.restore();

      animeFrameRef.current = requestAnimationFrame(runLoop);
    };

    runLoop();

    return () => {
      if (animeFrameRef.current) {
        cancelAnimationFrame(animeFrameRef.current);
      }
    };
  }, [config, activePreset, zoom, panX, panY]);

  // --- Mouse Interface / Interaction Listeners ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const barY = FLOOR_Y - config.barHeight * SCALE;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
    const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
    const rawMouseX = (e.clientX - rect.left) * scaleX;
    const rawMouseY = (e.clientY - rect.top) * scaleY;

    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const mouseX = (rawMouseX - cx - panX) / zoom + cx;
    const mouseY = (rawMouseY - cy - panY) / zoom + cy;

    justAddedHangerRef.current = false;

     // 1. Check if user clicked an existing anchor first (higher priority targets)
    let clickTargetIdx = -1;
    let closestDist = 20; // click radius for nodes

    particlesRef.current.forEach((p, idx) => {
      if (isWrappedNode(idx)) return; // Skip wrapped side-nodes of hangers

      const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
      if (dist < closestDist) {
        closestDist = dist;
        clickTargetIdx = idx;
      }
    });

    if (clickTargetIdx !== -1) {
      if (clickTargetIdx === 0 || clickTargetIdx === particlesRef.current.length - 1) {
        onTemporaryStatus("Ends are permanently fixed to the boundaries of the metal bar");
        return;
      }
      draggedNodeIndexRef.current = clickTargetIdx;
      draggedPosRef.current = { x: mouseX, y: mouseY };
      dragStartPosRef.current = { x: mouseX, y: mouseY };
      
      const targetName = particlesRef.current[clickTargetIdx].isAnchor ? "Slide Clip" : "Pull Rope";
      onTemporaryStatus(`Dragging: ${targetName}`);
      return;
    }

    // 2. If close to the metal bar, click to instantly Add an anchor (clip)
    const isNearBar = Math.abs(mouseY - barY) < 15;
    const barLengthPx = config.barLength * SCALE;
    const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
    const barEndX = barStartX + barLengthPx;

    if (isNearBar && mouseX >= barStartX && mouseX <= barEndX) {
      // Find closest rope node horizontally to snap
      let closestNodeIdx = 0;
      let minXDiff = Infinity;
      
      particlesRef.current.forEach((p, idx) => {
        const xDiff = Math.abs(p.x - mouseX);
        if (xDiff < minXDiff) {
          minXDiff = xDiff;
          closestNodeIdx = idx;
        }
      });

      // Pin it!
      const p = particlesRef.current[closestNodeIdx];
      p.isAnchor = true;
      p.x = mouseX;
      p.y = barY;
      p.oldX = mouseX;
      p.oldY = barY;

      syncClipCount();
      onTemporaryStatus("Added hanger clip on metal bar");
      
      // Let them immediately drag this new clip
      draggedNodeIndexRef.current = closestNodeIdx;
      draggedPosRef.current = { x: mouseX, y: barY };
      dragStartPosRef.current = { x: mouseX, y: barY };
      justAddedHangerRef.current = true;
      return;
    }

    // 3. Otherwise, click in empty space starts PANNING
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const barY = FLOOR_Y - config.barHeight * SCALE;

    // Handle Panning
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
    const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
    const rawMouseX = (e.clientX - rect.left) * scaleX;
    const rawMouseY = (e.clientY - rect.top) * scaleY;

    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const mouseX = (rawMouseX - cx - panX) / zoom + cx;
    const mouseY = (rawMouseY - cy - panY) / zoom + cy;

    // If dragging update coordinates
      if (draggedNodeIndexRef.current !== null) {
      const draggedNode = particlesRef.current[draggedNodeIndexRef.current];
      
      if (draggedNode.isAnchor) {
        // Slides along the bar. If pulled down enough, unclip it!
        if (mouseY > barY + 24) {
          draggedNode.isAnchor = false;
          draggedPosRef.current = { x: mouseX, y: mouseY }; // transition cleanly to free flow drag
          onTemporaryStatus("Unclipped hanger (sliding off bar)");
          syncClipCount();
        } else {
          draggedPosRef.current = { x: mouseX, y: barY };
        }
      } else {
        // Dragging raw rope. If pushed up against the bar, lock/clip it!
        if (Math.abs(mouseY - barY) < 14) {
          const barLengthPx = config.barLength * SCALE;
          const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
          const barEndX = barStartX + barLengthPx;
          
          if (mouseX >= barStartX && mouseX <= barEndX) {
            draggedNode.isAnchor = true;
            draggedPosRef.current = { x: Math.max(barStartX, Math.min(barEndX, mouseX)), y: barY };
            onTemporaryStatus("Snapped/Clipped rope segment onto bar");
            syncClipCount();
          } else {
            draggedPosRef.current = { x: mouseX, y: mouseY };
          }
        } else {
          draggedPosRef.current = { x: mouseX, y: mouseY };
        }
      }
      return;
    }

    // Set cursor handle types and hover highlights
    let hoveredIdx = -1;
    let minHoverDistance = 16;
    
    particlesRef.current.forEach((p, idx) => {
      if (isWrappedNode(idx)) return; // Skip wrapped side-nodes of hangers

      const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
      if (dist < minHoverDistance) {
        minHoverDistance = dist;
        hoveredIdx = idx;
      }
    });

    setHoveredNodeIndex(hoveredIdx);

    const barLengthPx = config.barLength * SCALE;
    const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
    const barEndX = barStartX + barLengthPx;
    const isNearBar = Math.abs(mouseY - barY) < 15 && mouseX >= barStartX && mouseX <= barEndX;

    if (hoveredIdx !== -1) {
      const p = particlesRef.current[hoveredIdx];
      if (hoveredIdx === 0 || hoveredIdx === particlesRef.current.length - 1) {
        canvas.style.cursor = "not-allowed";
      } else {
        canvas.style.cursor = p.isAnchor ? "ew-resize" : "grab";
      }
      setIsNearBarHover(null);
    } else if (isNearBar) {
      canvas.style.cursor = "cell";
      setIsNearBarHover({ x: mouseX });
    } else {
      canvas.style.cursor = isPanningRef.current ? "grabbing" : "grab";
      setIsNearBarHover(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
    
    const canvas = canvasRef.current;
    if (canvas && draggedNodeIndexRef.current !== null && dragStartPosRef.current && !justAddedHangerRef.current) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
      const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
      const rawMouseX = (e.clientX - rect.left) * scaleX;
      const rawMouseY = (e.clientY - rect.top) * scaleY;

      const cx = LOGICAL_WIDTH / 2;
      const cy = LOGICAL_HEIGHT / 2;
      const mouseX = (rawMouseX - cx - panX) / zoom + cx;
      const mouseY = (rawMouseY - cy - panY) / zoom + cy;

      const draggedNode = particlesRef.current[draggedNodeIndexRef.current];
      if (draggedNode.isAnchor && draggedNodeIndexRef.current !== 0 && draggedNodeIndexRef.current !== particlesRef.current.length - 1) {
        // If they click on the hanger clip and release it without substantial dragging, remove it!
        const dist = Math.hypot(mouseX - dragStartPosRef.current.x, mouseY - dragStartPosRef.current.y);
        if (dist < 4) {
          draggedNode.isAnchor = false;
          onTemporaryStatus("Removed hanger clip via click");
          syncClipCount();
        }
      }
    }

    if (draggedNodeIndexRef.current !== null) {
      onTemporaryStatus("Released rope segment");
    }
    draggedNodeIndexRef.current = null;
    draggedPosRef.current = null;
    dragStartPosRef.current = null;
    justAddedHangerRef.current = false;
  };

  const handleMouseLeave = () => {
    isPanningRef.current = false;
    draggedNodeIndexRef.current = null;
    draggedPosRef.current = null;
    dragStartPosRef.current = null;
    justAddedHangerRef.current = false;
    setHoveredNodeIndex(null);
    setIsNearBarHover(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
    const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
    const rawMouseX = (e.clientX - rect.left) * scaleX;
    const rawMouseY = (e.clientY - rect.top) * scaleY;

    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const mouseX = (rawMouseX - cx - panX) / zoom + cx;
    const mouseY = (rawMouseY - cy - panY) / zoom + cy;

    // Find if we double-clicked an anchor (hanger clip)
    let clickedAnchorIdx = -1;
    let closestDist = 24;

    particlesRef.current.forEach((p, idx) => {
      if (p.isAnchor && idx !== 0 && idx !== particlesRef.current.length - 1) {
        const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (dist < closestDist) {
          closestDist = dist;
          clickedAnchorIdx = idx;
        }
      }
    });

    if (clickedAnchorIdx !== -1) {
      particlesRef.current[clickedAnchorIdx].isAnchor = false;
      onTemporaryStatus("Unclipped hanger via double-click");
      syncClipCount();
    }
  };

  // --- Touch Gesture Controls for Mobile (Pinch-to-Zoom, Hold to Drag, Tap Hangers) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    justAddedHangerRef.current = false;
    touchStartTimeRef.current = Date.now();

    const barY = FLOOR_Y - config.barHeight * SCALE;

    if (e.touches.length === 2) {
      // 2 fingers: pinch-to-zoom and pan
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchDistRef.current = dist;
      lastTouchCenterRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      
      // Cancel active single finger drags
      draggedNodeIndexRef.current = null;
      draggedPosRef.current = null;
      isPanningRef.current = false;
      isTouchDraggingRef.current = false;
      return;
    }

    if (e.touches.length === 1) {
      // 1 finger interactions: dragging or tapping
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
      const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
      const rawX = (touch.clientX - rect.left) * scaleX;
      const rawY = (touch.clientY - rect.top) * scaleY;

      const cx = LOGICAL_WIDTH / 2;
      const cy = LOGICAL_HEIGHT / 2;
      const mouseX = (rawX - cx - panX) / zoom + cx;
      const mouseY = (rawY - cy - panY) / zoom + cy;

      touchStartPosRef.current = { x: mouseX, y: mouseY };

      // Look for any close node to drag (expand radius to 30px to be fingertip friendly)
      let targetIdx = -1;
      let closestDist = 30;

      particlesRef.current.forEach((p, idx) => {
        if (isWrappedNode(idx)) return;
        const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (dist < closestDist) {
          closestDist = dist;
          targetIdx = idx;
        }
      });

      if (targetIdx !== -1) {
        if (targetIdx === 0 || targetIdx === particlesRef.current.length - 1) {
          onTemporaryStatus("Ends are fixed to the boundaries of the metal bar");
          return;
        }
        draggedNodeIndexRef.current = targetIdx;
        draggedPosRef.current = { x: mouseX, y: mouseY };
        dragStartPosRef.current = { x: mouseX, y: mouseY };
        isTouchDraggingRef.current = true;
        
        const targetName = particlesRef.current[targetIdx].isAnchor ? "Slide Clip" : "Pull Rope";
        onTemporaryStatus(`Dragging: ${targetName}`);
      } else {
        // Fall back to panning
        isPanningRef.current = true;
        panStartRef.current = { x: touch.clientX, y: touch.clientY };
        isTouchDraggingRef.current = false;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2 && lastTouchDistRef.current && lastTouchCenterRef.current) {
      // Pinch to Zoom scaling logic
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const factor = dist / lastTouchDistRef.current;
      lastTouchDistRef.current = dist;

      setZoom((prev) => Math.max(0.5, Math.min(4.0, prev * factor)));

      // Shift pan dynamically
      const dx = center.x - lastTouchCenterRef.current.x;
      const dy = center.y - lastTouchCenterRef.current.y;
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
      
      lastTouchCenterRef.current = center;
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (LOGICAL_WIDTH / rect.width) : 1;
      const scaleY = rect.height > 0 ? (LOGICAL_HEIGHT / rect.height) : 1;
      const rawX = (touch.clientX - rect.left) * scaleX;
      const rawY = (touch.clientY - rect.top) * scaleY;

      const cx = LOGICAL_WIDTH / 2;
      const cy = LOGICAL_HEIGHT / 2;
      const mouseX = (rawX - cx - panX) / zoom + cx;
      const mouseY = (rawY - cy - panY) / zoom + cy;

      const barLengthPx = config.barLength * SCALE;
      const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
      const barEndX = barStartX + barLengthPx;
      const barY = FLOOR_Y - config.barHeight * SCALE;

      if (isTouchDraggingRef.current && draggedNodeIndexRef.current !== null) {
        const draggedNode = particlesRef.current[draggedNodeIndexRef.current];
        if (draggedNode.isAnchor) {
          // If pulled down enough, unclip the slider
          if (mouseY > barY + 24) {
            draggedNode.isAnchor = false;
            draggedPosRef.current = { x: mouseX, y: mouseY };
            onTemporaryStatus("Unclipped hanger (sliding off bar)");
            syncClipCount();
          } else {
            draggedPosRef.current = { x: mouseX, y: barY };
          }
        } else {
          // Snap dragging rope onto the bar
          if (Math.abs(mouseY - barY) < 14) {
            if (mouseX >= barStartX && mouseX <= barEndX) {
              draggedNode.isAnchor = true;
              draggedPosRef.current = { x: Math.max(barStartX, Math.min(barEndX, mouseX)), y: barY };
              onTemporaryStatus("Snapped/Clipped rope segment onto bar");
              syncClipCount();
            } else {
              draggedPosRef.current = { x: mouseX, y: mouseY };
            }
          } else {
            draggedPosRef.current = { x: mouseX, y: mouseY };
          }
        }
        if (e.cancelable) e.preventDefault();
      } else if (isPanningRef.current) {
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;
        setPanX((prev) => prev + dx);
        setPanY((prev) => prev + dy);
        panStartRef.current = { x: touch.clientX, y: touch.clientY };
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    lastTouchDistRef.current = null;
    lastTouchCenterRef.current = null;

    const timeDiff = Date.now() - touchStartTimeRef.current;
    
    // Tap to add/remove hanger clip
    if (timeDiff < 350 && touchStartPosRef.current && !isTouchDraggingRef.current) {
      const mouseX = touchStartPosRef.current.x;
      const mouseY = touchStartPosRef.current.y;

      // Locate anchor if clicked near one
      let clickedAnchorIdx = -1;
      let closestDist = 28; // touch friendly radius

      particlesRef.current.forEach((p, idx) => {
        if (p.isAnchor && idx !== 0 && idx !== particlesRef.current.length - 1) {
          const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
          if (dist < closestDist) {
            closestDist = dist;
            clickedAnchorIdx = idx;
          }
        }
      });

      const barLengthPx = config.barLength * SCALE;
      const barStartX = (LOGICAL_WIDTH - barLengthPx) / 2;
      const barEndX = barStartX + barLengthPx;
      const barY = FLOOR_Y - config.barHeight * SCALE;

      if (clickedAnchorIdx !== -1) {
        // Remove hanger on tap
        particlesRef.current[clickedAnchorIdx].isAnchor = false;
        onTemporaryStatus("Removed hanger clip via touch tap");
        syncClipCount();
      } else {
        // Tap on bar adds hanger
        const isNearBar = Math.abs(mouseY - barY) < 18;
        if (isNearBar && mouseX >= barStartX && mouseX <= barEndX) {
          let closestNodeIdx = 0;
          let minXDiff = Infinity;
          
          particlesRef.current.forEach((p, idx) => {
            const xDiff = Math.abs(p.x - mouseX);
            if (xDiff < minXDiff) {
              minXDiff = xDiff;
              closestNodeIdx = idx;
            }
          });

          const p = particlesRef.current[closestNodeIdx];
          p.isAnchor = true;
          p.x = mouseX;
          p.y = barY;
          p.oldX = mouseX;
          p.oldY = barY;

          syncClipCount();
          onTemporaryStatus("Added hanger clip via touch tap");
        }
      }
    }

    if (draggedNodeIndexRef.current !== null && isTouchDraggingRef.current) {
      onTemporaryStatus("Released rope segment");
    }

    draggedNodeIndexRef.current = null;
    draggedPosRef.current = null;
    dragStartPosRef.current = null;
    isPanningRef.current = false;
    isTouchDraggingRef.current = false;
    justAddedHangerRef.current = false;
    touchStartPosRef.current = null;
  };

  return (
    <div className="relative w-full flex-1 h-full min-h-[280px] max-h-[48vh] md:max-h-none md:min-h-[500px] border-x-0 md:border border-slate-800 rounded-none md:rounded-xl bg-slate-950 overflow-hidden shadow-2xl flex flex-col justify-center items-center">
      
      {/* Zoom Controls Overlay */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-850/80 rounded-lg p-0.5 sm:p-1 md:p-1.5 shadow-lg gap-0.5 sm:gap-1 pointer-events-auto select-none z-10">
        <button
          onClick={() => {
            setZoom((prev) => Math.max(0.5, Math.min(4.0, prev - 0.15)));
            onTemporaryStatus("Zoomed Out");
          }}
          className="p-px px-1.5 sm:p-0.5 sm:px-2 md:p-1 md:px-2.5 rounded bg-slate-800 hover:bg-slate-700 hover:text-slate-100 border border-slate-700/60 text-slate-300 transition-all text-[8.5px] sm:text-[10px] md:text-xs font-semibold cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <span className="text-[8.5px] sm:text-[9.5px] md:text-[10px] font-sans text-slate-300 font-bold px-0.5 sm:px-1 min-w-[24px] sm:min-w-[32px] text-center tracking-tight">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => {
            setZoom((prev) => Math.max(0.5, Math.min(4.0, prev + 0.15)));
            onTemporaryStatus("Zoomed In");
          }}
          className="p-px px-1.5 sm:p-0.5 sm:px-2 md:p-1 md:px-2.5 rounded bg-slate-800 hover:bg-slate-700 hover:text-slate-100 border border-slate-700/60 text-slate-300 transition-all text-[8.5px] sm:text-[10px] md:text-xs font-semibold cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <div className="w-px h-2.5 md:h-3.5 bg-slate-800" />
        <button
          onClick={() => {
            setZoom(1.0);
            setPanX(0);
            setPanY(0);
            onTemporaryStatus("Reset view scaling and pan position");
          }}
          className="px-1.5 py-0.25 sm:px-2 sm:py-0.5 md:px-2.5 md:py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-slate-100 border border-slate-700/60 text-[8px] sm:text-[9.5px] md:text-[10px] text-slate-200 font-sans font-bold tracking-tight transition-all cursor-pointer"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>

      {/* Visual Canvas Backdrop */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block transition-all"
        style={{ touchAction: "none" }}
        id="physics-canvas"
      />

      {/* Embedded Floating Help Badges */}
      <div className="absolute bottom-2.5 left-3 right-3 flex justify-between items-center text-[8.5px] sm:text-[9.5px] text-slate-400 font-sans tracking-tight uppercase font-bold pointer-events-none select-none">
        <div className="flex items-center gap-1">
          <span className="flex h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
          <span>{particlesRef.current.length || 250} NODES</span>
        </div>
        <div className="flex gap-2">
          <span className="hidden sm:inline opacity-60">GRID 1FT</span>
          <span>DRAG ROPE • TAP BAR</span>
        </div>
      </div>
    </div>
  );
};
