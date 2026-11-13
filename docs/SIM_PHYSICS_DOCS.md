# Document 1 — `sim/` (Physics Core)

Copy into `sim/DOCS.txt`.

---

## `sim/` — Physics Core

The physics core is the mathematical layer. It knows nothing about games, rendering, input, or time loops. Everything here is a pure calculation, callable from any context — a browser game, a headless test, or a calculator page.

**Dependency rule:** Nothing in `sim/` imports from `game/`. The direction is always `game → sim`, never the reverse.

**Units:** SI only. Meters, seconds, kilograms, Newtons, radians. No exceptions.

**Coordinate frame:** Standard math — y-up, x-right. Renderers must flip y once at draw time. Physics never flips.

**Validation:** Constructors and step functions validate inputs and throw on invalid values. Silent coercion hides bugs; failing loudly is deliberate.

---

### `sim/vec2.ts`

**Purpose:** 2D vector math. Used by every other file in `sim/`.

**Exports:** `class Vec2 { x: number; y: number }`

**Methods:**
- `add(o)`, `sub(o)`, `scale(s)` — return **new** `Vec2` instances (immutable pattern)
- `dot(o)` — scalar product
- `mag()`, `mag2()` — vector length and squared length
- `norm()` — unit vector; returns zero vector for zero-length input, never NaN
- `clone()` — deep copy

**Convention:** All arithmetic returns new instances. Never mutate in place. Use `pos = pos.add(v)`, not `pos.addInPlace(v)`.

---

### `sim/constants.ts`

**Purpose:** Physical constants. Single source of truth.

**Exports:**
- `G = 6.6743e-11` — gravitational constant (CODATA value), m³·kg⁻¹·s⁻²
- `AU = 1.495978707e11` — astronomical unit, meters
- `EARTH_RADIUS`, `EARTH_MASS` — from NASA Planetary Fact Sheet
- `MOON_RADIUS`, `MOON_MASS` — from NASA Planetary Fact Sheet
- `MARS_RADIUS`, `MARS_MASS` — from NASA Planetary Fact Sheet
- `DEFAULT_DENSITY = 5514` — kg/m³, Earth-like fallback for bodies constructed from radius alone

**Rule:** Any constant that appears in physics goes here. Never inline a physical constant into `body.ts`, `physics.ts`, or elsewhere. If you add Jupiter, add `JUPITER_MASS` and `JUPITER_RADIUS` here.

---

### `sim/body.ts`

**Purpose:** A celestial body — planet, moon, asteroid, terrain chunk. Bodies are **static** in the current scope; the `velocity` field exists so contact math can use relative velocity when a body is conceptually moving (e.g. a moon orbiting a planet in a future version).

**Exports:** `interface BodyInit`, `class Body`

**BodyInit fields:**

| Field | Required | Meaning |
|---|---|---|
| `name` | ✅ | Non-empty string, used in impact events and HUD |
| `position` | ✅ | `Vec2`, meters, world frame |
| `radius` | ✅ | positive meters |
| `velocity` | ❌ | `Vec2`, m/s. Defaults to zero. |
| `mass` | ❌ | kg, > 0. If provided, used directly. |
| `density` | ❌ | kg/m³, > 0. Only used if `mass` is omitted. |
| `maxSafeLandingSpeed` | ❌ | m/s, default **20** |
| `maxSafeLandingAngleDeg` | ❌ | degrees from surface normal, default **30** |
| `surfaceFriction` | ❌ | per-step tangential multiplier, `[0, 1]`, default **0.98** |

**Mass rule — this is the "unknown weight" feature:**

1. If `mass` is provided → use it.
2. Else if `density` is provided → `mass = density × (4/3)π·radius³`.
3. Else → `mass = DEFAULT_DENSITY × (4/3)π·radius³`.

So a body specified as `{ radius: 3e6, density: 4000 }` gets a real mass of ~4.5e23 kg without the caller knowing the value. **This is exactly what "bodies with unknown weights" means in the spec.**

**Validation:** All required fields validated. `surfaceFriction` clamped to `[0, 1]`. `maxSafeLandingSpeed` and `maxSafeLandingAngleDeg` must be > 0. Throws on any violation.

**Instance fields:** All `BodyInit` fields, with `velocity` always a real `Vec2`, `mass` always computed or provided, landing params always present with defaults resolved.

---

### `sim/ship.ts`

**Purpose:** The player ship. **Mutable** — the physics core writes to it every step.

**Exports:** `interface Impact`, `class Ship`

**`Impact` shape:**
```
{ bodyName: string; speed: number; angleDeg: number; crashed: boolean }
```

**Ship fields:**

| Field | Default | Unit | Meaning |
|---|---|---|---|
| `position` | from ctor | m | world frame |
| `velocity` | zero | m/s | world frame |
| `radius` | 2 | m | collision radius |
| `dryMass` | 1000 | kg | ship structure |
| `fuelMass` | 800 | kg | depletes with throttle |
| `cargoMass` | 0 | kg | future gameplay |
| `playerMass` | 80 | kg | crew |
| `mass` | computed | kg | sum of the four above; kept current by `updateMass()` |
| `thrust` | 40_000 | N | at full throttle |
| `fuelBurnRate` | 2.0 | kg/s | at full throttle |
| `throttle` | 0 | 0..1 | set by game layer |
| `orientation` | π/2 | rad | starts "up" |
| `angularVelocity` | 0 | rad/s | set by game layer |
| `lastImpact` | null | — | **internal handoff**, set by `physics.ts`, read by game layer only via events |

**Methods:**

- **`updateMass()`** — recomputes `mass = dryMass + fuelMass + cargoMass + playerMass`. Validates each component is finite and ≥ 0, and total > 0. Throws on any violation. This is the "weight changes with player / cargo / fuel" mechanism.

- **`thrustForce()`** — returns `Vec2` force vector in Newtons:
  - Zero if `throttle ≤ 0` or `fuelMass ≤ 0`.
  - Otherwise `(cos θ, sin θ) × thrust × throttle`.

- **`burnFuel(dt)`** — removes `fuelBurnRate × throttle × dt` kg of fuel, clamps to 0, then calls `updateMass()`. Called by `physics.ts` inside the integration loop.

---

### `sim/physics.ts`

**Purpose:** All physics calculations. The heart of the engine.

**Exports:**

| Export | Signature | Purpose |
|---|---|---|
| `IMPACT_EPSILON` | `0.5` (m/s) | Minimum radial speed for a contact to count as an impact event. Resting contacts below this are ignored. |
| `gravityAt` | `(pos, bodies) → Vec2` | Total gravitational acceleration from all bodies. Per-body softening = `(0.01 × radius)²` to avoid singularity. |
| `localG` | `(pos, bodies) → number` | Magnitude of `gravityAt`. |
| `weight` | `(ship, bodies) → number` | `ship.mass × localG(ship.position)`, Newtons. |
| `twr` | `(ship, bodies, throttle=1) → number` | Thrust-to-weight ratio. Returns `∞` if weight = 0. |
| `surfaceGravity` | `(b) → number` | `GM/R²`. m/s². |
| `escapeVelocity` | `(b) → number` | `√(2GM/R)`. m/s. |
| `orbitalVelocity` | `(b, altitude=0) → number` | `√(GM/(R+h))`. m/s. |
| `altitude` | `({ position, radius }, body) → number` | Surface clearance, meters. Accepts `Ship` or lightweight probe. |
| `nearestBody` | `({ position, radius }, bodies) → { body, altitude } \| null` | Closest body. `null` if `bodies` is empty. |
| `canTakeOff` | `(ship, bodies, throttle=1) → TakeoffResult` | Throttle- and fuel-aware. Returns `{ canLiftOff, twr, thrustN, weightN, surfaceG, escapeVelocity, orbitalVelocity }`. |
| `checkLanding` | `(ship, bodies) → LandingResult` | **Predictive.** Tells you what *would* happen if you landed right now, from current state. |
| `stepShip` | `(ship, bodies, { dt, substeps? }) → void` | Advances physics by `dt`. Integrates, burns fuel, resolves ground. Clears `ship.lastImpact` at the top. |
| `resolveGround` | `(ship, bodies) → void` | Contact resolution: snap to surface, zero inward radial velocity, apply per-body friction, record `ship.lastImpact`. Called by `stepShip` every substep. |

**`stepShip` integration model:**
- Semi-implicit Euler (symplectic, stable for orbital motion).
- Forces: gravity from all bodies + thrust along orientation.
- Substep count: `substeps ?? ceil(dt / 0.02)`, minimum 1. Substepping keeps fast-moving ships from tunneling through terrain.
- Fuel burn and ground contact run every substep.

**Contact math (`resolveGround`):**
- Work in the body's frame: `vRel = ship.velocity - body.velocity`. Critical for moving planets — without this, a gentle landing on a moving moon reads as a huge impact.
- Radial component `v·n̂`: negative = approaching surface.
- Zero the inward radial component so the ship doesn't sink.
- Tangential friction: `vTan × body.surfaceFriction`.
- Restore to world frame: `ship.velocity = vNew + body.velocity`.
- Impact recorded **before** velocity is zeroed. If this order is reversed, the impact is invisible — this was a real bug in an earlier version.

**`checkLanding` vs `ship.lastImpact` — critical distinction:**

- `checkLanding(ship, bodies)` is **predictive**: "if I landed right now, here's the speed and angle." Call it **before** `stepShip` for HUD hints. After `stepShip`, the ship's velocity has already been resolved at the surface, so `checkLanding` returns `0 m/s / 0°` — useless at that point.
- `ship.lastImpact` is **historical**: "the contact that just happened during this step." Set by `resolveGround`, cleared by `stepShip` at the top of each call. **The game layer should never read this directly** — it goes through `game/events.ts` for a reason.

**Why `stepShip` clears `lastImpact`:** so each call reports only contacts that happened during that specific call. A caller looping `stepShip` must check `ship.lastImpact` between iterations to catch a contact — which is exactly what `game/engine.ts` does.

**Per-body landing thresholds:** `checkLanding` and `resolveGround` read `body.maxSafeLandingSpeed` and `body.maxSafeLandingAngleDeg`. This is why landing on the Moon (5 m/s safe) and Earth (20 m/s safe) work with the same code and different `Body` instances.

---

### Adding a new body — quick recipe

```ts
import { Body } from './body';
import { Vec2 } from './vec2';
import { JUPITER_MASS, JUPITER_RADIUS } from './constants';

const jupiter = new Body({
  name: 'Jupiter',
  position: new Vec2(7.78e11, 0),
  radius: JUPITER_RADIUS,
  mass: JUPITER_MASS,
  maxSafeLandingSpeed: 40,
  maxSafeLandingAngleDeg: 20,
});

// Or, if you don't know the mass:
const mystery = new Body({
  name: 'Mystery',
  position: new Vec2(1e9, 0),
  radius: 4e6,
  density: 3500,
});
```

---

### What `sim/` does NOT do

- It does not read input.
- It does not render.
- It does not maintain a time loop.
- It does not know that a "game" exists.
- It does not use `Math.random()`. Ever.
- It does not integrate planet motion. `Body.velocity` is used in contact math but the body's position does not update. Fine for takeoff/landing on static terrain; insufficient for interplanetary flight over weeks.

---

### API surface for the `game/` layer

If you're writing the game layer, `sim/` exposes exactly this and nothing more that you need:

- `Vec2` — for all vector math
- `Body`, `BodyInit` — terrain data model
- `Ship`, `Impact` — player data model
- The full function list from `physics.ts` above

You will not import `sim/constants.ts` directly. You will not import anything from `sim/vec2.ts` other than `Vec2`. If you find yourself reaching into `sim/` beyond `{ Vec2, Body, Ship, Impact, physics }`, that's a sign the boundary is being violated — the correct fix is to add the missing functionality to `physics.ts`, not to bypass it.