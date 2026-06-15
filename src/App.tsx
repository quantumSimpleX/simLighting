/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { SimulationConfig, LightPreset } from "./types";
import { PhysicsCanvas } from "./components/PhysicsCanvas";
import { ControlPanel } from "./components/ControlPanel";
import { 
  Lightbulb, 
  HelpCircle, 
  Settings, 
  Activity, 
  Flame,
  Dribbble,
  RefreshCw
} from "lucide-react";

const LIGHT_PRESETS: LightPreset[] = [
  {
    id: "warm",
    name: "Warm White (~3000K)",
    color: "rgb(255, 239, 210)",
    glowColor: "rgba(255, 185, 100, 0.6)",
    shadowColor: "#ff9c3a",
    bgGlowClass: "from-amber-950/14 via-slate-950 to-slate-950",
  },
  {
    id: "neutral",
    name: "Neutral White (~4000K)",
    color: "rgb(255, 248, 235)",
    glowColor: "rgba(255, 220, 160, 0.6)",
    shadowColor: "#ffe5a3",
    bgGlowClass: "from-yellow-950/8 via-slate-950 to-slate-950",
  },
  {
    id: "cool",
    name: "Cool White (~6500K)",
    color: "rgb(240, 248, 255)",
    glowColor: "rgba(160, 215, 255, 0.65)",
    shadowColor: "#7fc0ff",
    bgGlowClass: "from-blue-950/12 via-slate-950 to-slate-950",
  },
  {
    id: "amber",
    name: "Cozy Amber (~2200K)",
    color: "rgb(255, 220, 150)",
    glowColor: "rgba(255, 140, 40, 0.65)",
    shadowColor: "#ff740a",
    bgGlowClass: "from-amber-950/18 via-slate-950 to-slate-950",
  },
  {
    id: "neon-pink",
    name: "Retro Synth Pink",
    color: "rgb(255, 215, 255)",
    glowColor: "rgba(255, 30, 160, 0.7)",
    shadowColor: "#ff1e96",
    bgGlowClass: "from-pink-950/10 via-slate-950 to-slate-950",
  },
  {
    id: "cyan",
    name: "Cyber Oasis Cyan",
    color: "rgb(215, 255, 255)",
    glowColor: "rgba(0, 225, 245, 0.7)",
    shadowColor: "#00e1f5",
    bgGlowClass: "from-cyan-950/15 via-slate-950 to-slate-950",
  },
  {
    id: "forest",
    name: "Emerald Auroral",
    color: "rgb(205, 255, 205)",
    glowColor: "rgba(35, 220, 95, 0.65)",
    shadowColor: "#23dc5f",
    bgGlowClass: "from-emerald-950/10 via-slate-950 to-slate-950",
  },
];

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>({
    ropeLength: 15, // in feet, default 15ft
    barLength: 6, // in feet, default 6ft
    barHeight: 6.5, // mounting height in feet, default 6.5ft (5.5 - 7.5 range)
    brightness: 2250, // 300 * 15ft * 0.5 = 2250 lumens default
    colorPresetId: "warm",
    gravity: 0.25,
    stiffness: 0,
    customHue: 30, // Default rainbow color is a warm reddish-orange (30 degrees)
    wrapCount: 3,
  });

  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [clipsCount, setClipsCount] = useState<number>(2);
  const [statusText, setStatusText] = useState<string>("Simulator initialized.");

  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Updates status feedback messages with a gentle self-clearing timer
  const handleTemporaryStatus = (status: string) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    setStatusText(status);
    statusTimerRef.current = setTimeout(() => {
      setStatusText("");
    }, 4000);
  };

  // Safe handler that clamps brightness and length constraints dynamically
  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    let statusMsg = "";
    
    setConfig((prev) => {
      // Keep lumen per foot ratio constant across length adjustments
      const currentDensity = prev.ropeLength > 0 ? prev.brightness / prev.ropeLength : 150;

      const merged = { ...prev, ...newConfig };
      
      // 1. Maintain length ranges first (rope minimum is barLength, maximum is 4 * barLength)
      const minAllowedRope = merged.barLength;
      const maxAllowedRope = 4 * merged.barLength;
      
      if (merged.ropeLength < minAllowedRope) {
        merged.ropeLength = minAllowedRope;
        statusMsg = `Clamped rope length to minimum of ${minAllowedRope}ft to match the bar width`;
      } else if (merged.ropeLength > maxAllowedRope) {
        merged.ropeLength = maxAllowedRope;
        statusMsg = `Clamped rope length to maximum of ${maxAllowedRope}ft (4x bar length)`;
      }

      // 2. Scale brightness to keep lumen density constant during length slider changes
      if (newConfig.ropeLength !== undefined) {
        merged.brightness = Math.round(currentDensity * merged.ropeLength);
      }

      // 3. Clamp brightness after establishing exact rope length
      const maxAllowedBrightness = 300 * merged.ropeLength;
      if (merged.brightness > maxAllowedBrightness) {
        merged.brightness = Math.round(maxAllowedBrightness);
        statusMsg = `Clamped brightness to maximum (${merged.brightness} lumens for ${merged.ropeLength}ft rope)`;
      }

      if (!statusMsg) {
        if (newConfig.barLength !== undefined && newConfig.ropeLength === undefined) {
          statusMsg = `Adjusted suspension bar range to ${newConfig.barLength} ft`;
        } else if (newConfig.barHeight !== undefined) {
          statusMsg = `Adjusted suspension bar height to ${newConfig.barHeight} ft above the floor`;
        } else if (newConfig.ropeLength !== undefined) {
          statusMsg = `Adjusted rope length to ${merged.ropeLength} ft`;
        } else if (newConfig.brightness !== undefined) {
          statusMsg = `Luminous output adjusted to ${newConfig.brightness} lumens`;
        } else if (newConfig.colorPresetId !== undefined) {
          if (newConfig.colorPresetId === "custom") {
            statusMsg = `Switched rope color to rainbow spectrum hue (${merged.customHue ?? 30}°)`;
          } else {
            const found = LIGHT_PRESETS.find((p) => p.id === newConfig.colorPresetId);
            if (found) {
              statusMsg = `Switched color temperature to ${found.name}`;
            }
          }
        } else if (newConfig.customHue !== undefined) {
          statusMsg = `Adjusted color spectrum hue to ${newConfig.customHue}°`;
        } else if (newConfig.wrapCount !== undefined) {
          statusMsg = `Set rope wrap complexity setting to ${newConfig.wrapCount} wraps`;
        }
      }

      // Schedule status message update in the next tick to prevent updates during render
      if (statusMsg) {
        setTimeout(() => {
          handleTemporaryStatus(statusMsg);
        }, 0);
      }

      return merged;
    });
  };

  const handleResetArrangement = () => {
    setResetTrigger((prev) => prev + 1);
    handleTemporaryStatus("Simulation reset to default hanging curves");
  };

  const isCustom = config.colorPresetId === "custom";
  const customHue = config.customHue ?? 30;

  const customPreset: LightPreset = {
    id: "custom",
    name: `Rainbow Color (${customHue}°)`,
    color: `hsl(${customHue}, 100%, 93%)`,
    glowColor: `hsla(${customHue}, 100%, 65%, 0.65)`,
    shadowColor: `hsl(${customHue}, 100%, 50%)`,
    bgGlowClass: "",
  };

  const activePreset = isCustom 
    ? customPreset 
    : (LIGHT_PRESETS.find((p) => p.id === config.colorPresetId) || LIGHT_PRESETS[0]);

  const bgStyle = isCustom 
    ? { backgroundImage: `radial-gradient(ellipse at top, hsla(${customHue}, 80%, 12%, 0.14) 0%, rgb(2, 6, 23) 75%)` }
    : undefined;

  return (
    <div 
      className={`h-screen max-h-screen overflow-hidden bg-slate-950 ${isCustom ? "" : `bg-gradient-to-b ${activePreset.bgGlowClass}`} transition-all duration-1000 flex flex-col justify-between p-0 md:p-6 lg:p-6 selection:bg-slate-800 selection:text-slate-200`}
      style={bgStyle}
    >
      
      {/* Upper Navigation / Decorative Meta Layer */}
      <header className="max-w-[1350px] w-full mx-auto mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0 pt-4 md:pt-0 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Lightbulb className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Rope Light <span className="font-light text-slate-400">by Quantum Simplex</span>
            </h1>
          </div>
        </div>

        <div className="hidden md:flex gap-3 text-[11px] text-slate-500 font-sans tracking-tight font-medium uppercase">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Interactive WebGL 2D Canvas</span>
          </div>
        </div>
      </header>

      {/* Main Sandbox Interactive Split Grid */}
      <main className="max-w-[1350px] w-full mx-auto flex-1 flex flex-col lg:flex-row gap-0 md:gap-6 items-stretch justify-center lg:overflow-hidden min-h-0 overflow-hidden">
        
        {/* Left Side: Physical Simulation Viewport */}
        <div className="h-[45vh] lg:h-full shrink-0 lg:flex-1 flex flex-col gap-4 min-w-0">
          <PhysicsCanvas
            config={config}
            presets={LIGHT_PRESETS}
            activePreset={activePreset}
            resetTrigger={resetTrigger}
            onClipCountChange={setClipsCount}
            onTemporaryStatus={handleTemporaryStatus}
          />
        </div>

        {/* Right Side: Operational Control Dock */}
        <ControlPanel
          config={config}
          onChangeConfig={handleConfigChange}
          presets={LIGHT_PRESETS}
          activePreset={activePreset}
          onReset={handleResetArrangement}
          clipsCount={clipsCount}
          statusText={statusText}
        />

      </main>

    </div>
  );
}
