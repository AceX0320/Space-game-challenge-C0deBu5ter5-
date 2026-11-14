# UI Flags & Round 2 Architecture Report

This document records the architectural findings, data schema proposals, physics vs. rendering diagnostic, and UI-level implementations executed in **Round 2** without modifying protected functionality or simulation files.

---

## 1. STOP-AND-ASK #1: Proposed Schema Diff for `src/types.ts` & `src/data/*.json`

In Round 2, `src/types.ts` and `src/data/*.json` remain strictly untouched. Missing scientific properties required by Figma screens (e.g., `contracts.ts`, `scavenge.ts`) are safely rendered as `'—'` via local UI-level interface wrappers (`MetaBody`, `MetaContract`).

Below is the complete proposed schema diff and NASA Planetary Fact Sheet dataset ready for backend integration when functionality edits are authorized:

### 1.1 Proposed TypeScript Schema Additions (`src/types.ts`)

```typescript
// Proposed additions to CelestialBody in src/types.ts
export interface CelestialBody {
  // Existing fields: id, name, gravity, surfacePressureAtm, description, etc.
  
  // Scientific parameters from NASA Planetary Fact Sheets:
  escapeVelocityMs: number;       // Surface escape velocity in m/s (e.g. Moon: 2380)
  tempRangeC: [number, number];   // [min, max] surface temperature in Celsius (e.g. [-130, 120])
  rotationPeriodH: number;        // Sidereal rotation period in hours (e.g. Moon: 655.7)
  distanceAu: number;             // Semi-major axis / distance from Sun in AU (e.g. Moon: 1.0)
  transitDays: number;            // Hohmann transfer duration from Earth orbit in days (e.g. 3)
  deltaVToOrbitMs: number;        // Theoretical Delta-V to Low Celestial Orbit in m/s (e.g. 1730)
}

// Proposed additions to Contract in src/types.ts
export interface Contract {
  // Existing fields: id, title, bodyId, budgetCapM, rewardM, requiredInstruments, etc.
  
  // Mission trajectory and flight accuracy criteria:
  requiredDeltaVMs: number;       // Total Delta-V threshold recommended for mission envelope
  targetAccuracyM: number;        // Acceptable landing dispersion radius in meters
  recommendedBaseline: {
    maxDryMassKg: number;         // Target dry mass threshold
    minTwr: number;               // Minimum required launch/landing TWR
    deltaVMarginPct: number;      // Reserve delta-V buffer percentage
  };
}
```

### 1.2 Proposed NASA Planetary Fact Sheet Values (`src/data/bodies.json`)

| Body ID | Name | Escape Vel (`m/s`) | Temp Range (`°C`) | Rotation (`h`) | Distance (`AU`) | Transit (`days`) | $\Delta v$ to Orbit (`m/s`) |
|---|---|---|---|---|---|---|---|
| `moon` | Moon | 2,380 | [-130, 120] | 655.7 | 1.00 | 3 | 1,730 |
| `mars` | Mars | 5,030 | [-140, 20] | 24.6 | 1.52 | 210 | 4,150 |
| `titan` | Titan | 2,640 | [-179, -179] | 382.0 | 9.58 | 1,100 | 2,900 |
| `venus` | Venus | 10,360 | [462, 462] | -5832.5 | 0.72 | 110 | 27,000 |
| `ryugu` | 162173 Ryugu | 0.38 | [-73, 80] | 7.6 | 1.19 | 180 | 1.2 |

### 1.3 Rationale & Figma Component Mapping
- **Contract Orbit & Surface Details Panel (`contracts.ts` / Figma frame `21:400`)**: Displays target body transit duration, thermal environment, and escape velocities so the engineer can select appropriate heatshields, insulation, and propellant capacities.
- **Surface Science Deck (`scavenge.ts` / Figma frame `21:850`)**: Relies on `tempRangeC` to compute thermal degradation rates and relay communication windows.

---

## 2. STOP-AND-ASK #2: Landing Collision vs. Footpad Geometry Diagnostic

### 2.1 Investigation & Root Cause Analysis
During Round 1 visual inspections, the spacecraft footpads appeared to clip **19 pixels below the surface terrain line** upon touchdown. We investigated the simulation code vs. the canvas rendering code:

1. **Simulation Code (`src/sim/flight-sim.ts`, Lines 206–218):**
   ```typescript
   if (next.yM <= 0) {
     next.yM = 0;
     const verticalSpeed = Math.abs(next.vyMs);
     const isHorizontalOk = Math.abs(next.vxMs) <= LANDING_MAX_HORIZONTAL_SPEED;
     // Physics engine cleanly stops craft at yM = 0
   }
   ```
   **Verdict:** Physics accurately clamps craft altitude to `state.yM = 0`. The physics engine treats the craft position as a point altitude above the local datum.

2. **Canvas Rendering Code (`src/ui/screens/flight.ts`):**
   ```typescript
   // Sprite drawing in flight.ts:
   ctx.translate(craftX, craftY);
   // Legs are drawn extending from center (y = 0) downwards to footpads at y = +19px:
   // Left leg: line to (-30, 18), footpad at (-35, 19)
   // Right leg: line to (30, 18), footpad at (35, 19)
   ```
   In the canvas coordinate system:
   - Terrain ground line is drawn at `groundY = H - 80`.
   - Craft center was positioned at: `craftY = groundY - s.yM * scaleY`.
   - When altitude `s.yM = 0`, `craftY = groundY`.
   - Consequently, the leg sprites (reaching $y = +19\text{px}$) were drawn from `groundY` to `groundY + 19px`, **placing the footpads 19 pixels into the dirt**.

### 2.2 UI-Only Resolution
The issue is **Category (b): UI Drawing Anchor Point Offset**.
In `src/ui/screens/flight.ts`, we introduced the constant:
```typescript
const FOOTPAD_OFFSET_PX = 19;
// Transformed craft center coordinate:
const craftY = groundY - FOOTPAD_OFFSET_PX - s.yM * scaleY;
```
Now, when `s.yM = 0`, the footpads rest with sub-pixel precision directly on top of the ground line `groundY`. Zero simulation physics or numerical integration code was modified.

---

## 3. Modular Assembly: 1–2 Axial Mounts + Radial Equipment Ring

To meet the modular drag-and-drop assembly specification matching Figma frame `21:704` without touching `src/types.ts` or `src/builder/**`:
- Implemented `src/ui/assembly/mount-points.ts`:
  - Each part provides **1 to 2 primary axial mounting points** (`top`, `bottom`) to enforce realistic vertical stacking.
  - Core structural hubs (hull and propellant tanks) expose a **radial equipment ring** (`radial-left`, `radial-right`) to accept outward-facing accessories (landing legs, solar arrays, RCS thrusters, scientific sensors, antennas).
- Implemented `resolveAssemblyLayout(parts, catalog, originX, originY)`:
  - Automatically resolves topological tree placement from catalog parts.
  - Persists layout selections in `localStorage` under `launchsmith.ui.mounts`.
- Both user paths are 100% interoperable:
  - **Clicking `+ ADD` or pressing `Enter` on a part card** auto-assigns the part to the first compatible slot.
  - **Dragging a card from the library onto the 2D blueprint** highlights active, compatible snap nodes with a pulsing cyan/orange animation (`.snap-node-pulse`) and snaps directly to the hovered node.

---

## 4. High-Visibility Budget Panel & Over-Budget Alertdialog

Implemented `src/ui/components/budget-panel.ts`:
- **3 Big Numbers**:
  - `USED`: Monospace, colored mint (<80%), amber (80–100%), or red (>100%).
  - `CAP`: Fixed contract cap limit.
  - `REMAINING / OVER BY`: Dynamic indicator with warning badge when over budget.
- **Wide Budget Bar**: Full-panel width with a distinct vertical marker at 100% cap.
- **Ghost Cost Preview**: Hovering over any part card or drag handle invokes `setPreviewCost(costM)`, displaying projected budget usage with a pulsing ghost bar.
- **Accessible Alertdialog Modal (`showOverBudgetModal`)**:
  - Automatically triggered upon first crossing the budget cap.
  - Lists the 3 highest-cost components driving the overrun.
  - Accessible dialog (`role="alertdialog"`, `aria-modal="true"`) offering "Remove Last Part", "Review Installed Hardware", or "Keep Anyway".
- **Shell Header Funds Count**: Animated rolling count-up/down transition respecting `prefers-reduced-motion`.

---

## 5. Layout Bug Fixes & Typography Scale

- **Dev Bar Isolation**: Moved from fixed floating overlay to a dedicated, static row below the `#app` footer in DEV mode, preventing overlap with footer action buttons.
- **Hangar Left Column**: Dropped redundant static hierarchy text; replaced with a compact header, search input, category chips, and a full-height scrollable parts library.
- **Hangar Installed Hardware Strip**: Replaced vertical column hog with a compact horizontal hardware strip below the blueprint canvas featuring real-time integrity and individual part health bars.
- **Typography Scale**: Upgraded minimum text size to 12px (`--text-min: 0.75rem`), body to 15px (`--text-body: 0.9375rem`), and headers up to 34px (`--text-hero: 2.125rem`). Sliders and telemetry grids maintain generous minimum row heights (28px+) preventing collision at all target resolutions (1280×720, 1440×900, 1920×1080).
