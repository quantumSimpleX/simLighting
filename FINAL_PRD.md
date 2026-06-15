# Product Requirements Document (PRD): LumenTension Physics Workbench
**Brand / Maintainer:** Quantum Simplex (2026)  
**Standard Specification:** High-Fidelity Euler-Verlet Particle Rope Simulator with Friction-Wrapped Contacts and Ambient CCT Luminance.

---

## 1. Project Vision & Architecture

The **LumenTension Physics Workbench** is an interactive, real-time, 2D physical playground simulating tensioned rope wrapping physics, friction dynamics, and glowing electrical cable rendering on structural suspension bars. 

The application is structured as a highly responsive, single-page application built on **Vite**, **React**, and **Tailwind CSS**. Performance is a primary constraint; all calculations are executed locally via high-rate iteration loops inside an HTML5 `Canvas2D` rendering pipeline designed to maintain solid 60 FPS performance on both modern desktop systems and performance-constrained mobile screens.

---

## 2. Core Physics Engine (Euler-Verlet)

Success in recreating this simulator depends on replicating the Euler-Verlet particle solver coupled with iterative distance projection constraints and state-based anchor nodes.

### 2.1. Rope Representation
The rope is modeled as an ordered chain of $N$ discrete particle points:
$$\mathbf{P} = \{p_0, p_1, \dots, p_{N-1}\}$$
Each particle $p_i$ is defined by:
*   `x, y`: Current logical coordinates (projected at 60px per logical foot).
*   `px, py`: Particle coordinates in the previous timestep (used to implicitly calculate velocity and momentum).
*   `ax, ay`: Cumulative instantaneous force accelerations.
*   `isStatic`: Boolean flag indicating if the node is rigidly locked as a contact point to the supporting bar.

### 2.2. Mathematical Integration Steps
At each simulation tic (target delay of 16.67ms), the physics loop executes a forward Euler-Verlet Integration update:
$$x_{\text{new}} = x + (x - x_{\text{prev}}) \cdot (1 - D) + a_x \cdot \Delta t^2$$
$$y_{\text{new}} = y + (y - y_{\text{prev}}) \cdot (1 - D) + a_y \cdot \Delta t^2$$

Where:
*   $\Delta t$ is the normalized delta timestep (clamped closely around 0.16 to prevent system explosion under rapid coordinate changes).
*   $D$ is the medium damping coefficient, representing air resistance and joint friction.
*   $a_y$ includes a constant downward gravity acceleration constant ($g$).

### 2.3. Dual-Pass Distance Constraint Resolution
Rope stiffness is maintained by solving rigid distance boundaries between sequential particles:
$$L_i = \| p_{i+1} - p_i \|$$
If $L_i$ deviates from the rest-length $d$ (total rope length divided by $N-1$), the particles are moved along their collision axis:
$$\Delta = d - L_i$$
$$\mathbf{\hat{u}} = \frac{p_{i+1} - p_i}{L_i}$$
*   If neither particle is static, both are shifted toward each other by $0.5 \cdot \Delta \cdot \mathbf{\hat{u}}$.
*   If one particle is locked (`isStatic: true`), the dynamic particle absorbs $100\%$ ($1.0$) of the correction factor to keep the string taut.

To ensure structural rigidity, constraint corrections are solved iteratively $k$ times ($k = 8$ to $15$ iterations depending on stiffness configuration).

### 2.4. Stiffness Interpolation (Rope Stiffness Modulator)
A configurable **Stiffness** slider scales $S \in [0.0, 1.0]$. This value serves as an interpolation scalar for constraints:
*   When $S \to 0$ (Limp), constraint corrections are relaxed, allowing soft, natural chain sagging and high canvas elasticity.
*   When $S \to 1$ (Solid), constraint projection scales to 100% stiffness, creating high-frequency tension waves and immediate physical feedback.

---

## 3. Contact & Friction Mechanics (Wrapped Bar Physics)

One of the defining innovations of this simulator is the creation of continuous "anchor points" representing wrapped wraps around a structural steel suspension bar.

### 3.1. Anchor Logic & Wrap Coordinates
*   The system defines a horizontal steel bar positioned at $Y = y_{\text{bar}}$ (derived from the slider-controlled height $H \in [5\text{ft}, 8\text{ft}]$).
*   Particles that contact the bar are flagged with `isStatic: true`.
*   Contact points can slide horizontally along the $x$-axis within the span defined by the Bar Length parameter ($L_{\text{bar}}$).
*   When the user adjusts "Wraps" $W \in [2, 10]$:
    *   The engine dynamically distributes wrap points along the bar, grouping or spreading them to simulate helical loops.

### 3.2. Drag and Slide Interaction
*   Users can tap, hold, and pull a wrapped clip directly on the bar.
*   Once targeted by touch, the anchor adjusts its $x$-coordinate to track the pointer, dragging the associated Verlet chain with it.
*   The wrap nodes are bound within the dynamic bar coordinates $[-\frac{1}{2} L_{\text{bar}}, \frac{1}{2} L_{\text{bar}}]$, maintaining neat wrap margins.

---

## 4. UI/UX & Responsive Layout Strategy

The UI layout utilizes high-contrast aesthetic pairings designed to prioritize vertical screen efficiency and direct touch target feedback.

### 4.1. General Structure & Typography
*   **Typography:** The layout strictly uses high-legibility, system-default sans-serif fonts (`font-sans`, `-apple-system`, `system-ui`) across all elements (including ranges, helper badges, and labels) to maximize available padding and eliminate layout overflow issues typical of fixed-width fonts on smaller screens.
*   **Theme:** Deep Midnight Space Slate (dark matte charcoal `#0f172a` canvases alongside glowing neon sliders and buttons).
*   **Infrastructure Hygiene:** No unrequested tech telemetry, containers, status bars, mock command lines, lint reports, or redundant borders. The UI features simple and elegant margins wrapping cohesive grids.

### 4.2. Responsive Grid Grid Layout
*   **Desktop/Large Screens (`lg:` and higher):** Sidebar layout with a horizontal layout splitting the HTML5 canvas workspace on the left and the Simulator Workbench control drawer on the right.
*   **Mobile Screens:** The layout dynamically transitions to a vertical stack. The simulator viewport scales cleanly on top, while parameters and buttons are rendered inside a two-column responsive grid directly underneath.

### 4.3. Interactive Control Workbench Elements
1.  **# of Wraps Slider & Action Row:**
    *   Shows a graphical title, the active parameter value enclosed in high-contrast textboxes, a responsive range slider, and a dedicated **Randomize Action Button**.
    *   **Desktop View:** The button shows a compact reload icon along with an explicit text label (`"RANDOMIZE"`).
    *   **Mobile View:** The button automatically collapses into an ultra-precise square button, highlighting itself in high-visibility Amber (`bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950`) to draw visual attention on narrower layouts.
    *   **Slider Auto-sizing:** The wraps slider has no restrictive minimum width boundaries on mobile devices, ensuring it shrinks without pushing the action button out of the device viewport.
2.  **Stiffness / Length / Height / Brightness Control Sliders:**
    *   Each slider features an icon, a bold parameter value (e.g. `ft` or `lm`), and range indicators underneath.
    *   **Contrast Hierarchy:** To prevent visual clutter, range scale text (e.g., `"5 ft"` to `"10 ft"`) is set to a muted slate gray color (`text-slate-500 font-sans tracking-tight font-bold`), ensuring it is always less bright than the actual numerical value displayed on the top right of the slider.
3.  **Luminance & Color Engine Picker:**
    *   Quick presets for standard Warm white ($\sim 3000\text{K}$), Neutral white ($\sim 4000\text{K}$), and Cool Daylight ($\sim 6500\text{K}$) white values.
    *   **Custom Hue Spectrum Slider:** Rendered as a beautiful linear gradient spectrum with a mirror circular color indicator that scale-animates on focus.
4.  **Copyright and Credits Footer:**
    *   Reads simply and cleanly: `2026 Quantum Simplex` with lightweight styling.

---

## 5. Touch & Interactivity Specifications

Uncompromised support for multi-touch mobile devices is a critical project requirement.

| Action / Interaction | Mobile (Touch Gestures) | Desktop (Mouse Events) |
| :--- | :--- | :--- |
| **Swing Rope / Add Kinetic Energy** | Finger drag across any active segment in the lower rope loops (forces apply vector delta to nearest particles). | Mouse hover-hold and drag. |
| **Slide Contact Loops** | Tap and drag the contact point along the bar surface horizontally. | Left-click and drag horizontally. |
| **Release Wrap Point** | Swipe/drag the clip down vertically away from the bar, or tap the clip point directly. | Click on an active clip point, or drag it downwards off the bar. |
| **Add New Contact Point** | Tap anywhere along an empty region of the horizontal suspension bar. | Click on an empty region of the bar. |
| **Multi-touch Zoom & Panning** | 2-finger pinch gesture on the simulation field to zoom; 1-finger drag on bare background to pan. | Compact zoom buttons (`+`, `-`, `Reset`) located in the top-right overlay. |

---

## 6. Deployment & Build Directives

When duplicating, bundling, or mounting this workbench on production instances, adhere strictly to the following parameters:

```bash
# Install core dependencies
npm install

# Build target production build compiled static assets in dist/ directory
npm run build
```

*   **HTML Canvas Initialization:** The canvas container has an immediate `ResizeObserver` setup that feeds responsive width metrics straight into the rendering context, automatically scaling pixel densities (`window.devicePixelRatio`) to eliminate text or vector blurriness on retinal displays.
*   **Rendering Optimizations:** To shield low-end mobile devices from performance degradation, particle rendering operations use a single, unified canvas drawing path (drawing the complete Verlet thread with a single, high-contrast glow filter `stroke()`).
