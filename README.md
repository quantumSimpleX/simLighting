# 💡 Rope Light Simulator

An interactive, high-fidelity **2D Physics Workbench & Rope Light Simulator** built using **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It features a custom **Euler-Verlet physics engine** that simulates tensioned rope wraps, sliding friction contact points, and radiant ambient CCT (Correlated Color Temperature) glow illumination.

Developed under the designation **Quantum Simplex**, this simulator bridges rigorous mechanics with a tactile, visually stunning digital playground.

---

## 🌟 Core Features

### 1. High-Fidelity Euler-Verlet Physics
- **Particle-Chain Representation:** The flexible rope is simulated as a chain of discrete physical particles linked by rigid distance constraints.
- **Dynamic Damping:** Incorporates natural air resistance, joint friction, and gravity coefficients.
- **Adjustable Stiffness:** Instantly transition the rope from highly elastic and **Limp (0%)** to structurally tensioned and **Rigid (100%)**.

### 2. Friction-Wrapped Contacts (Wrap Dynamics)
- **Friction Clips:** Simulate the physical wraps of a rope coiled around a horizontal metal bar.
- **Dynamic Sliding:** Grab and slide wrap points horizontally along the suspension bar.
- **Pliable Anchors:** Click or pull wraps downwards to release them from the bar, or tap open regions of the bar to attach new clips dynamically.
- **Wrap Randomization:** Instant procedural distribution of coiled loops to discover unique physical equilibrium states.

### 3. Radiant Ambient Light Projection
- **Real-Time Luminance:** Simulates high-intensity LED light strings from **0 to 300 lumens per foot** of rope length.
- **CCT Temperature Presets:** Quick-select keys for industrial white ranges:
  - 🌅 **Warm White** (~3000K)
  - ☀️ **Neutral White** (~4000K)
  - ❄️ **Cool Daylight** (~6500K)
- **Interactive Spectrum:** A gorgeous rainbow hue slider for fully custom color presets, complete with an animated color indicator.

### 4. Desktop & Mobile Optimized Workspace
- **Retina Scaling:** Dynamically scales to pixel-perfect high-density viewports (`window.devicePixelRatio`).
- **Touch & Gesture Mapping:** Pinch-to-zoom and canvas panning are native, creating an organic physical connection on mobile screens.
- **Adaptive Responsive Layout:** Collapses from a spacious desktop bento-sidebar into a highly compact, two-column vertical workbench stack on mobile screens.

---

## 🛠️ Physical Simulation Principles

The core engine is driven by a custom particle integrator running inside an HTML5 `Canvas2D` rendering thread at a steady 60 FPS:

### Verlet Integration Step
For every particle, position is integrated without explicit velocity tracking, preserving energy and resolving constraints beautifully:
```ts
x_new = x + (x - x_prev) * (1 - Damping) + acceleration_x * dt^2
y_new = y + (y - y_prev) * (1 - Damping) + acceleration_y * dt^2
```

### Iterative Constraint Resolution
Rope stiffness is maintained by iteratively projecting distance corrections between successive nodes. If a node is locked directly onto the bar, it absorbs 100% of the correction, keeping wrap positions rigidly anchored while letting loose segments swing dynamically.

---

## 🎮 Interaction Cheat Sheet

| Action | On Desktop (Mouse) | On Mobile (Touch) |
| :--- | :--- | :--- |
| **Swing Rope & Pull Loops** | Click and drag any dynamic segment of the rope. | Touch and drag the glowing cable threads. |
| **Slide Contact Points** | Left-click and drag the wrap clips horizontally. | Press and drag contact loops on the suspension bar. |
| **Release Wrap Point** | Click directly on a wrap, or drag it downwards. | Tap a clip point directly, or pull it down off the bar. |
| **Add Wrap Point** | Click any empty region on the horizontal bar. | Tap any vacant area along the metal bar. |
| **Zoom & View Pan** | Use the `+` / `-` / `Reset` interface buttons. | Two-finger pinch to scale; drag on empty background to pan. |

---

## 🚀 Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone or copy this repository to your workspace.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running Development Server
Launch the interactive development server:
```bash
npm run dev
```

### Production Bundling
Compile and build optimized production-ready static assets:
```bash
npm run build
```
The output files will be cleanly bundled into the `/dist` directory.

---

## 🎨 Design Theme & Aesthetics

- **Typography:** Built purely on high-legibility, system-default sans-serif pairings to prevent text overflow and conserve screen real estate.
- **Color Palette:** Warm and deep midnight slate elements contrasted with high-luminance glowing light paths.
- **Credits:** Under the license and trademark of **Quantum Simplex** (2026).
