/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SimulationConfig, LightPreset } from "../types";
import { 
  Sun, 
  Ruler, 
  RefreshCw, 
  Lightbulb, 
  HelpCircle,
  Sparkles,
  Activity,
  Feather,
  GitCommit
} from "lucide-react";

interface ControlPanelProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  presets: LightPreset[];
  activePreset: LightPreset;
  onReset: () => void;
  clipsCount: number;
  statusText: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  presets,
  activePreset,
  onReset,
  clipsCount,
  statusText,
}) => {
  const maxBrightness = 300 * config.ropeLength;

  return (
    <div className="w-full lg:w-80 bg-slate-900 border-t md:border border-slate-800 rounded-none md:rounded-xl p-3.5 md:p-4 flex flex-col justify-between gap-3 shadow-xl overflow-y-auto lg:overflow-visible min-h-0 flex-1 lg:flex-none">
      
      {/* 1. Header / Basic Info */}
      <div className="hidden md:flex flex-col gap-1">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">
            Simulator Workbench
          </h2>
        </div>
      </div>

      {/* 2. Main Config Form */}
      <div className="flex-1 flex flex-col gap-3 mt-0.5">

        {/* Responsive Grid for Sliders: 2 columns on mobile/tablet to save vertical space, 1 column on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-3.5 gap-y-4 lg:gap-y-5.5">
          
          {/* # of Wraps & Randomizer Column */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                <span>Wraps</span>
              </div>
              <div className="w-[42px] h-6 flex items-center justify-center text-amber-400 font-sans font-black bg-slate-950 rounded border border-slate-800 text-[11.5px] text-center shrink-0 tracking-tight">
                {config.wrapCount}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={2}
                max={5}
                step={1}
                value={config.wrapCount}
                onChange={(e) => onChangeConfig({ wrapCount: parseInt(e.target.value) })}
                className="flex-1 min-w-0 h-1.5 accent-amber-500 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                id="workbench-wrap-count-slider"
              />
              <button
                onClick={onReset}
                className="w-[42px] md:w-auto h-6 flex items-center justify-center gap-1 px-1 md:px-2 rounded border transition-all duration-150 cursor-pointer active:scale-95 shadow-sm shrink-0 bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 md:bg-slate-800 md:border-slate-700 md:text-slate-200 md:hover:bg-slate-700"
                title="Randomize wraps configuration"
                id="workbench-randomize-button"
              >
                <RefreshCw className="h-3 w-3 shrink-0" />
                <span className="hidden md:inline text-[9.5px] uppercase tracking-wider font-extrabold whitespace-nowrap">Randomize</span>
              </button>
            </div>
          </div>

          {/* Rope Stiffness */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <span>Stiffness</span>
              </div>
              <span className="font-sans text-slate-100 font-bold text-[11px] tracking-tight">{(config.stiffness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.stiffness}
              onChange={(e) => onChangeConfig({ stiffness: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-slate-200 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              id="stiffness-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans tracking-tight font-bold">
              <span>0% (Limp)</span>
              <span>100% (Rigid)</span>
            </div>
          </div>
          
          {/* Bar Length */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                <span>Bar Len</span>
              </div>
              <span className="font-sans text-slate-100 font-bold text-[11px] tracking-tight">{config.barLength} ft</span>
            </div>
            <input
              type="range"
              min={5}
              max={10}
              step={0.5}
              value={config.barLength}
              onChange={(e) => onChangeConfig({ barLength: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-slate-200 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              id="bar-length-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans tracking-tight font-bold">
              <span>5 ft</span>
              <span>10 ft</span>
            </div>
          </div>

          {/* Bar Height Control (configurable below Bar Length) */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                <span>Height</span>
              </div>
              <span className="font-sans text-slate-100 font-bold text-[11px] tracking-tight">{config.barHeight.toFixed(1)} ft</span>
            </div>
            <input
              type="range"
              min={5}
              max={8}
              step={0.1}
              value={config.barHeight}
              onChange={(e) => onChangeConfig({ barHeight: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-slate-200 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              id="bar-height-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans tracking-tight font-bold">
               <span>5 ft</span>
               <span>8 ft</span>
            </div>
          </div>

          {/* Rope Length */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-slate-400" />
                <span>Rope Len</span>
              </div>
              <span className="font-sans text-slate-100 font-bold text-[11px] tracking-tight">{config.ropeLength} ft</span>
            </div>
            <input
              type="range"
              min={config.barLength}
              max={4 * config.barLength}
              step={0.5}
              value={config.ropeLength}
              onChange={(e) => onChangeConfig({ ropeLength: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-slate-200 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              id="rope-length-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans tracking-tight font-bold">
              <span>Bar len ({config.barLength} ft)</span>
              <span>4x Bar ({4 * config.barLength} ft)</span>
            </div>
          </div>

          {/* Rope Brightness */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-slate-400" />
                <span>Brightness</span>
              </div>
              <span className="font-sans text-slate-100 font-bold text-[11px] tracking-tight">{config.brightness} lm</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxBrightness}
              step={10}
              value={config.brightness}
              onChange={(e) => onChangeConfig({ brightness: parseInt(e.target.value) })}
              className="w-full h-1.5 accent-slate-200 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              disabled={maxBrightness === 0}
              id="brightness-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans tracking-tight font-bold">
              <span>0 lm</span>
              <span className="opacity-80">Max {maxBrightness} lm (300/ft)</span>
            </div>
          </div>

        </div>

        {/* Color & Temp */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            <span>Color & Temp</span>
          </label>
          
          {/* Three standard CCT temperature buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "warm", label: "Warm White", temp: "~3000K", bg: "#ff9c3a" },
              { id: "neutral", label: "Neutral White", temp: "~4000K", bg: "#ffe5a3" },
              { id: "cool", label: "Cool White", temp: "~6500K", bg: "#7fc0ff" }
            ].map((cct) => {
              const isSelected = config.colorPresetId === cct.id;
              return (
                <button
                  key={cct.id}
                  onClick={() => onChangeConfig({ colorPresetId: cct.id })}
                  className={`py-1.5 px-1 rounded-lg border-2 text-[10px] font-semibold tracking-tight transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                    isSelected
                      ? "border-slate-100 text-slate-100 bg-slate-800/95 shadow-md shadow-slate-950 scale-[1.02]"
                      : "border-slate-800/85 text-slate-400 bg-slate-950/40 hover:border-slate-700 hover:text-slate-300"
                  }`}
                  id={`preset-${cct.id}`}
                  title={`${cct.label} ${cct.temp}`}
                >
                  <span className="font-semibold text-[10.5px] truncate w-full text-center tracking-tight">
                    {cct.id === "warm" ? "Warm" : cct.id === "neutral" ? "Neutral" : "Cool"}
                  </span>
                  <span className="text-[8px] opacity-80 block font-sans font-bold tracking-tight">
                    {cct.temp}
                  </span>
                  
                  {/* Subtle color mini indicator dot inside of button */}
                  <span 
                    className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" 
                    style={{ backgroundColor: cct.bg }}
                  />
                </button>
              );
            })}
          </div>

          {/* Rainbow Color Spectrum Slider */}
          <div className="flex flex-col gap-1 mt-0.5">
            {config.colorPresetId === "custom" && (
              <div className="flex justify-end text-[9.5px] text-indigo-350 font-sans font-bold tracking-tight">
                Hue: {config.customHue ?? 30}°
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={config.customHue ?? 30}
                onChange={(e) => {
                  const hueVal = parseInt(e.target.value);
                  onChangeConfig({ colorPresetId: "custom", customHue: hueVal });
                }}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer outline-none border border-slate-950/80 shadow-inner animate-none"
                style={{
                  background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                }}
                id="rainbow-hue-slider"
              />
              
              {/* Mirror Color Indicator */}
              <div 
                className={`h-4.5 w-4.5 rounded-full shrink-0 border transition-all duration-300 shadow-sm ${
                  config.colorPresetId === "custom" 
                    ? "scale-110 border-slate-100 ring-2 ring-indigo-500/30 font-semibold" 
                    : "opacity-40 border-slate-800 scale-95"
                }`}
                style={{
                  backgroundColor: `hsl(${config.customHue ?? 30}, 100%, 55%)`,
                }}
                title={config.colorPresetId === "custom" ? "Custom rainbow spectrum active" : "Slide to select rainbow colors"}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-sans tracking-tight mt-1 text-center leading-tight">
            Selected: <span className="text-slate-200 font-semibold">{activePreset.name}</span>
          </p>
        </div>

      </div>

      {/* 3. Footer Reset Action */}
      <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-800">

        {/* Quick Instructions Tooltip */}
        <div className="text-[10px] text-slate-200 flex gap-1.5 items-start bg-slate-950/45 p-1.5 rounded border border-slate-800/80 font-sans tracking-tight">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
          <p className="leading-snug">
            Drag glowing loops to swing rope. Drag contact points (where rope wraps the bar) to slide. Click or drag down a contact point to release it. Click empty bar space to add.
          </p>
        </div>

        {/* Credits section */}
        <div className="text-[10.5px] text-slate-350 font-sans flex flex-col gap-0.5 border-t border-slate-800/40 pt-2">
          <div className="flex items-start gap-1">
            <span className="leading-snug text-slate-300 font-sans tracking-tight font-semibold">2026 Quantum Simplex</span>
          </div>
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-slate-400 font-medium tracking-tighter">
            <span className="flex items-center gap-1 text-[10px]">
              <Feather className="h-3 w-3 text-slate-500" /> Euler-Verlet
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <GitCommit className="h-3 w-3 text-slate-500" /> Rigid Constraints v14
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
