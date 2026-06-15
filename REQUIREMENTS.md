# LumenTension Physics Lab - System Requirements & Technical Specification

Welcome to the **LumenTension Physics Lab** technical specification. This document outlines the physical, mathematical, visual, and operational rules governing the real-time simulation of flexible, non-elastic glowing rope lights suspended under gravity.

---

## 1. System Overview & Core Goals
The application is a browser-native 2D interactive physical sandbox designed to compute structural suspension and lighting behavior.

1. **Flexible, Inelastic Rope Mechanics**: Compute gravity, tension, stiffness, and collision dynamics in real time.
2. **Dynamic Wrapping & Contact Friction**: Permit the rope to wrap around a horizontal support bar multiple times, forming sliding friction contact points.
3. **Interactive Manipulation**: Allow users to drag physical nodes to swing loops, slide wrap points along the bar, release loops by pulling down on contact hangers, and add new points by clicking empty bar segments.
4. **Energy-Consistent Brightness Controls**: Scale lumen output relative to rope length to maintain a continuous, natural linear light density (lm/ft).
5. **Architectural Grid Reference**: Provide real-world grid overlays (1 ft solid, 5 ft dotted) anchored to an adjustable suspension bar and floor reference level.

---

## 2. Physics & Structural Mathematics

### 2.1 Verlet Integration & Node Dynamics
The rope is modeled as a chain of discrete physical particles (nodes) connected by inelastic rigid distance constraints (distance $d = L_{segment}$).
* **Integration Scheme**: A semi-implicit Euler-Verlet integrator calculates high-frequency position-to-velocity relationships to avoid accumulation errors common in standard Euler integrations.
* **Force Accumulation**:
  $$\vec{x}_{new} = \vec{x} + (\vec{x} - \vec{x}_{prev}) + \vec{a} \cdot \Delta t^2$$
  Where acceleration contains:
  1. **Gravity**: Constant downward vector (configurable via config limits).
  2. **Damping/Drag**: Low-coefficient medium damping to simulate atmospheric drag and resist chaotic oscillation.
  3. **User Pulling Force**: Spring-like hooke force directed from node under touch to mouse pointer.

### 2.2 Distance Constraints & Stiffness relaxation
Inelastic rope behaviors are enforced by resolving connecting constraints $C_j(\vec{x}_a, \vec{x}_b) = \|\vec{x}_a - \vec{x}_b\| - L_j = 0$ iteratively.
* **Iterative Solver Passes**: Configured for 15+ resolution passes per animation frame to prevent rope bouncing (maintaining rigid, non-elastic rope behavior).
* **Bent Stiffness / Resistance**: A flexural stiffness factor resists sharp bending between adjacent segments. If stiffness is increased, a restoring torque is applied at each connected vertex:
  $$\vec{F}_{restore} = k_{stiff} \cdot (\vec{x}_{i+1} + \vec{x}_{i-1} - 2\vec{x}_i)$$

### 2.3 Support Bar Friction & Wrapping Dynamics
The horizontal bar represents a static bounding line ($y = y_{bar}$) where nodes can interact.
* **Anchored Hangers / Wraps**: Hangers represent loops of rope wrapped around the bar:
  - Subject to sliding friction forces along the horizontal coordinate.
  - Can be manually slid left or right when dragged by the user.
* **Released Loops**: Hangers are released (unwrapped) if dragged downward by a sufficient vertical distance threshold, reverting back to flowing free rope nodes.
* **Collision Resolution**: Any non-hanger node is prevented from penetrating upward above the boundary bar line, resolving elastic normal impulses.

---

## 3. Lighting & Optics Formulas

### 3.1 Color Temperature Options (CCT)
Rope emission is governed by standard correlated color temperature profiles in Kelvins:
* **Warm White (~3000K)**: Emits a warm amber glow.
* **Neutral White (~4000K)**: Balanced natural sunlight simulation.
* **Cool White (~6500K)**: High-transparency blue-shifted daytime white.
* **Rainbow Spectrum**: Custom 360-degree color hue wheel with radial gradients.

### 3.2 Luminous Intensity Density
Total system brightness ($L_{total}$) matches real-world linear LED layouts, where intensity scales with length:
* **Natural Lumen/Ft Scaling**:
  $$\text{Luminous Density} = 300\text{ lumens per foot}$$
  $$\text{Maximum Brightness} = 300 \times \text{Rope Length (ft)}$$
* Moving the rope length slider automatically adjusts system voltage/luminous output to prevent unrealistic over-brightness or dimming in short ropes.

---

## 4. User Interaction & Control Scheme

### 4.1 Mouse & Gesture Mapping
* **Rope Grabbing**: Clicking and dragging any free segment node applies a localized dragging spring that pulls the rope toward the cursor, allowing the user to initiate swings, dynamic ripples, and wave propagation.
* **Slide Wrap Hangers**: Clicking and holding the circular visual hangers on the bar enables sliding left/right, dynamically adjusting the span lengths of adjacent catenary loops.
* **Release Hangers**: Pulling a hanger downwards by more than 15 pixels releases the knot, turning it into a free-hanging physical rope segment.
* **Add Wrap Points**: Left-clicking on an empty segment of the horizontal support bar automatically snaps a free node to the position, splitting the rope into an additional hanging wrap.

### 4.2 Interactive Simulator Dock (Sliders)
- **Wraps**: Adjusts the number of wrap contact sections (2 - 5 range).
- **Stiffness**: Controls the bend resistance of the rope (0% limp, 100% rigid solid tube).
- **Bar Len**: Modifies the horizontal span of the suspension bar (5 ft to 10 ft).
- **Height**: Controls mounting height of the suspension bar relative to the floor reference level (5 ft to 8 ft range).
- **Rope Len**: Adjusts rope physical segment length.
- **Brightness**: Controls total luminous output (lumens).

---

## 5. Interface Design & Responsiveness

### 5.1 Real Scale Studio Grid
To facilitate scale comparisons, the simulation canvas renders a structured architectural viewport:
* Scale Factor: **1 ft = 60 logical pixels**.
* **1 ft Grid Lines**: Rendered as highly visible **solid white lines** (opacity 0.12) to serve as standard units of measurement.
* **5 ft Grid Lines**: Rendered as elegant **dotted white division coordinates** (opacity 0.22, dash layout `[1, 4]`).
* **Floor Level**: Visual floor limit clearly anchored at the bottom coordinate, mapped precisely to the $0.0\text{ ft}$ vertical reference level.

### 5.2 Mobile Bleed Viewport
To optimize usability on touch-screen/mobile devices, the interface drops decorative margins to maximize usable area:
* **Border & Corner Release**: Panel elements drop `rounded-xl` structures and container side-borders on smaller screens, reverting automatically to a clean edge-to-edge full mobile arrangement.
* **Layout Re-stacking**: Sliders stack compactly under the primary Canvas view on mobile and adjust to double-column grids to conserve vertical scrolling space.
