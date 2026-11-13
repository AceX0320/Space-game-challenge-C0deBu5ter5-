# Document 2 — `game/` (Game Layer)

Copy into `game/DOCS.txt`.

---

## `game/` — Game Layer

The game layer sits on top of `sim/`. It owns the time loop, input handling, event folding, trajectory prediction, and HUD formatting. It is the boundary between physics and the rest of the application (rendering, UI, audio, multiplayer transport, etc.).

**Dependency rule:** `game/` imports from `sim/`. Never the reverse. The physics core must remain usable by tests and by a standalone calculator page without pulling in any game code.

**Dependency rule:** `game/` never imports from rendering, DOM, canvas, WebGL, audio, or React. It produces `GameState` and `ShipEvents`; the application consumes them.

**Units:** SI throughout, same as `sim/`. HUD strings are produced only by `game/units.ts`.

**Determinism:** Same seed + same `(dt, ShipCommand)` sequence → identical `GameState` and events. No `Math.random()` outside `game/rng.ts`'s `randomSeed()`.

**Coordinate frame:** World-frame absolute coordinates, y-up. HUD consumers compute relative values. Renderers flip y at draw time.

---

### `game/rng.ts`

**Purpose:** Seeded deterministic random number generator. The **only** source of randomness in the entire codebase.

**Algorithm:** Mulberry32 — 32-bit state, one integer, deterministic, fast, adequate statistical properties for gameplay.

**Exports:** `class Rng`, `function randomSeed(): number`

**Rng methods:**

| Method | Returns | Purpose |
|---|---|---|
| `next()` | `[0, 1)` | Uniform. Base method. |
| `range(min, max)` | `[min, max)` | Uniform float. Throws if `max ≤ min` or non-finite. |
| `int(min, maxExclusive)` | integer | Throws on non-integer or reversed bounds. |
| `pick(array)` | element | Throws on empty array. |
| `chance(p)` | boolean | True with probability `p`. `p` clamped to `[0,1]`. |
| `normal(mean, std)` | float | Box-Muller normal distribution. |
| `angle()` | `[0, 2π)` | Uniform radians. |
| `sign()` | `-1 \| +1` | 50/50. |
| `fork()` | `Rng` | Independent child stream. |
| `get seed()` | `number` | Current 32-bit state — save to reproduce the stream. |

**`fork()` — why it matters:**

Use one fork per subsystem (gameplay events, visual effects, level generation). Without forks, adding a single particle-color roll would shift the timing of every asteroid spawn, breaking reproducibility. With forks, each subsystem's stream is independent.

```ts
const eventsRng = engine.rng.fork();
const vfxRng    = engine.rng.fork();
// Consuming vfxRng does not affect eventsRng's future output.
```

**`randomSeed()` — the one non-deterministic call:** Uses `Math.random()`. Called exactly once, at `GameEngine` construction, unless the caller passes an explicit `seed`. Never call it during a run.

**Determinism rule:** grep the whole codebase for `Math.random`. The only hit should be inside `randomSeed()`.

---

### `game/commands.ts`

**Purpose:** The single input structure the engine accepts. Separates "what the player wants" from "how the keyboard reports it."

**Exports:**

- `interface ShipCommand { thrust: boolean; rotateLeft: boolean; rotateRight: boolean }`
- `EMPTY_COMMAND` — frozen all-false command, safe to spread
- `emptyCommand()` — fresh mutable all-false command
- `commandsEqual(a, b)` — structural equality

**Why this exists:** The engine never reads the keyboard. It reacts to a `ShipCommand`. That means:
- Physics is testable from scripted commands.
- The keyboard adapter (`input.ts`) can be swapped for a gamepad, replay file, or AI controller without touching the engine.
- `commandsEqual` enables "input changed this frame" detection, which triggers immediate trajectory refresh (otherwise turning would show a stale preview for up to 6 frames).

**No brake, no strafe:** The command shape intentionally has only three flags. If future gameplay needs a brake or RCS, add a field here — not a separate input path.

---

### `game/events.ts`

**Purpose:** Per-frame event signals. **One-shot** — true only in the frame the event fired, false otherwise.

**Exports:**

- `interface ShipEvents`:
  - `fuelEmpty: boolean` — fuel hit 0 this frame. **Edge-triggered** (fires on transition only, not while staying at 0).
  - `landed: boolean` — safe contact this frame.
  - `crashed: boolean` — unsafe contact this frame.
  - `escaped: boolean` — **reserved**, engine leaves `false`. Criterion TBD (distance? velocity?).
  - `impact: Impact | null` — the raw impact data from `ship.lastImpact`. Non-null implies exactly one of `landed`/`crashed` is true.
- `emptyEvents()` — fresh cleared struct. Call once per frame. Do not reuse an old struct.
- `hasAny(events)` — cheap "did anything fire?" early-out.

**Lifecycle:** `engine.update()` replaces `state.events` with `emptyEvents()`, populates it, returns it. The struct is not a queue — if you need event history, snapshot into your own list inside the game loop.

**Why `events.impact` exists separately from `ship.lastImpact`:** `ship.lastImpact` is the physics layer's internal handoff and is cleared at the top of every `stepShip` call. `events.impact` is the game-facing signal and survives the entire `update()` call. **Game code reads `events.impact`, never `ship.lastImpact`.**

---

### `game/state.ts`

**Purpose:** The `GameState` type — the read-only view of the world that the engine produces and everyone else consumes. **Types only, no logic.**

**Exports:**

- `interface TrajectoryImpact { body: Body; timeToImpact: number; impactSpeed: number; impactAngleDeg: number }`
- `interface Trajectory { points: Vec2[]; impact: TrajectoryImpact \| null; horizon: number }`
- `emptyTrajectory(horizon=0) → Trajectory` — safe fallback when no prediction exists
- `interface GameState`

**GameState fields:**

| Field | Type | Meaning |
|---|---|---|
| `bodies` | `Body[]` | Same instances passed to `new GameEngine`. Engine does not mutate. |
| `ship` | `Ship` | Mutated in place each tick. |
| `target` | `Body \| null` | Reference body for relative HUD. |
| `time` | `number` | Simulation seconds, monotonic, frozen while paused. |
| `trajectory` | `Trajectory` | Always non-null. `points[0]` is always current ship position. |
| `events` | `ShipEvents` | This frame's events. Same object as `update()` returns. |
| `paused` | `boolean` | When true, `update()` returns immediately. |

**Trajectory invariants:**
- `points[0]` = ship's current position (exactly).
- `points[points.length - 1]` = predicted contact point if `impact !== null`.
- `points.length ≤ nPoints + 1` from the trajectory options.
- `emptyTrajectory()` is used when there's nothing to predict (no bodies, or projection failed).

**Convention:** The engine **writes** to `GameState`. Everyone else **reads**. Do not mutate from UI code — use `engine.setTarget()`, `engine.setPaused()`, etc. for control.

---

### `game/input.ts`

**Purpose:** Keyboard → `ShipCommand` adapter. The only place in the codebase that touches `KeyboardEvent`.

**Exports:**

- `interface KeyMap { thrust: string[]; rotateLeft: string[]; rotateRight: string[] }` — physical key codes
- `DEFAULT_KEY_MAP` — W/Space → thrust, A/← → left, D/→ → right
- `class KeyboardInput`

**KeyboardInput constructor:** `(target?: Window, map?: KeyMap)` — both optional. `target` defaults to `window`. `map` defaults to `DEFAULT_KEY_MAP`.

**Methods:**
- `attach()` — starts listening. **Idempotent** — calling twice attaches once.
- `detach()` — stops listening and clears state. **Idempotent.**
- `read() → ShipCommand` — builds a fresh command from current key state.

**Behavior details that matter:**

- Uses `KeyboardEvent.code` (physical position, layout-independent), **not** `.key`. `KeyW` is the same physical key on QWERTY, AZERTY, and Dvorak.
- `preventDefault()` for `Space` and arrow keys only. Preventing default on every keydown would break Ctrl+W (close tab), Ctrl+R (reload), F12 (devtools), Tab navigation.
- `blur` event clears all keys. Without this, Alt-Tab while holding W leaves the ship thrusting forever.
- Does **not** implement throttle ramping, deadzones, or any gameplay logic. That's the engine's job.

**For headless tests:** Don't instantiate `KeyboardInput` at all. Just build `ShipCommand` literals and pass to `engine.update()`. That's the whole point of the adapter separation.

---

### `game/units.ts`

**Purpose:** SI → human-readable formatting for the HUD and logs. **Display only.** Physics never calls this.

**Exports:** All functions take SI input, return a display string:

| Function | Scaling |
|---|---|
| `formatDistance(m)` | m → km → Mm → Gm |
| `formatSpeed(mps)` | m/s → km/s |
| `formatMass(kg)` | kg → t → kt → Mt → Gt → Tt → Pt → Et → Zt |
| `formatForce(n)` | N → kN → MN → GN |
| `formatTime(s)` | ms → s → min → h → d |
| `formatAcceleration(mps2)` | m/s² (fixed) |
| `formatGForce(mps2)` | divided by 9.80665 → "g" |
| `formatAngleDeg(deg)` | degrees (input already in degrees) |
| `formatAngleRad(rad)` | converts radians → degrees |
| `formatPercent(ratio)` | ×100 → "%" |

**Conventions:**
- `-0.00` normalized to `0.00` — `(-0.001).toFixed(2)` returns `"-0.00"` in JS, which looks like a bug in a HUD.
- `NaN`/`Infinity` pass through as `String(x)` — let the HUD surface them so the operator sees the failure.
- Precision: 2 decimals for scaled units, 1 for base units.

**Not included:** no "short" and "long" variants. One format per quantity. If a specific HUD element needs a different precision, that's a HUD-level concern — format its value with a local helper, not by adding a `formatDistanceLong` to this file.

---

### `game/trajectory.ts`

**Purpose:** Predict the ship's path forward in time using the **same integrator** as the game. Guarantees prediction and reality agree.

**Exports:**

- `interface TrajectoryOptions { horizon?; points?; physicsDt?; includeThrust? }` — defaults: 60 s, 180 points, 0.05 s, `false`
- `predictTrajectory(ship, bodies, opts?) → Trajectory`

**Defaults:**
- `horizon: 60` — total preview window in seconds
- `points: 180` — evenly-spaced samples
- `physicsDt: 0.05` — internal step in seconds
- `includeThrust: false` — ballistic by default

**Algorithm:**
1. `points[0]` = current ship position.
2. Divide the horizon into `nPoints` equal time slices.
3. For each slice, integrate `stepsPerPoint` sub-steps using `gravityAt` and (optionally) thrust.
4. Adaptive sub-stepping: `dt` shrinks if `speed × dt > 5 m` — prevents tunneling through small bodies at high speed. Hard cap of 50 sub-steps per point.
5. At each sub-step, check `nearestBody` with a lightweight probe. If `altitude ≤ 0` → record impact and return early with the partial path.
6. If no impact by horizon → return path with `impact: null`.

**Guarantees:**
- `points[0]` = ship's current position exactly.
- If `impact !== null`, `points[last]` = predicted contact point.
- `impact.impactSpeed` matches what `ship.lastImpact.speed` would be after simulating forward — same formula, same relative-velocity logic.

**Does not:**
- Mutate `ship` or `bodies`.
- Clear `ship.lastImpact` (that's `stepShip`'s job).
- Model the engine's throttle ramp. `includeThrust: true` treats the *current* throttle as constant for the whole preview.

**Cost:** ~180–540 `gravityAt` calls per refresh. At 10 Hz refresh (every 6 frames at 60 FPS), that's ~1,800–5,400 gravity calls per second. Cheap enough to not worry about.

**When to use which mode:**
- Ballistic (`includeThrust: false`, default) — HUD path prediction, "where will I drift if I stop thrusting."
- Thrust-aware (`includeThrust: true`) — "where will I go if I keep this throttle." Note the throttle ramp caveat: if the throttle is currently ramping, the preview assumes it's already at steady-state. Lag is at most 0.25 s.

---

### `game/engine.ts`

**Purpose:** The engine. Owns the tick loop, input application, event folding, and trajectory refresh.

**Exports:** `interface EngineConfig`, `class GameEngine`

**Constructor:**
```
new GameEngine(bodies, ship, target?, cfg?)
```
- `bodies: Body[]` — terrain/celestial bodies
- `ship: Ship` — the player ship (engine mutates this in place)
- `target?: Body | null` — reference body for relative HUD readouts
- `cfg?: EngineConfig` — all fields optional

**EngineConfig fields:**

| Field | Default | Meaning |
|---|---|---|
| `fixedDt` | `1/60` | Physics tick in seconds |
| `maxSubstep` | `0.02` | Largest allowed substep |
| `maxSubsteps` | `20` | Hard cap on substeps per tick |
| `trajEveryNFrames` | `6` | Trajectory refresh period (in `update()` calls) |
| `trajectory` | `{}` | Forwarded to `predictTrajectory` |
| `seed` | `randomSeed()` | RNG seed. Same seed → same run. |

**Instance fields:**
- `readonly state: GameState` — the read-only world view
- `readonly rng: Rng` — the engine's RNG. **Fork this for any game-side randomness.**

**Methods:**

| Method | Purpose |
|---|---|
| `update(dt, cmd?) → ShipEvents` | Advance by `dt` seconds. Returns this frame's events (also `state.events`). |
| `setPaused(p)` | Pause/resume. Clears the accumulator on pause so resuming doesn't burst-simulate the paused time. |
| `get paused` | Current pause state. |
| `setTarget(t)` | Change the reference body for relative HUD. `null` disables relative readouts. |
| `speedRelativeToTarget()` | `{ radial, tangential, speed, normal } \| null`. Null if no target. |

**`speedRelativeToTarget()` decomposition:**
- `radial` — ship's velocity component along the line from target to ship. Positive = receding, negative = approaching.
- `tangential` — velocity component perpendicular to that line. Always positive.
- `speed` — `|vRel|`.
- `normal` — unit vector from target to ship.

Use radial for "approach speed" on the landing HUD, tangential for "drift."

**Per-`update()` loop:**

1. If `paused` → replace `state.events` with empty, return immediately.
2. Validate `dt` is finite, ≥ 0. Clamp to `[0, 0.1]` — protects against tab-switch multi-second deltas.
3. Clear `state.events`.
4. Detect input change (`!commandsEqual(cmd, lastCommand)`) — drives immediate trajectory refresh.
5. Accumulate `dt`. Loop while accumulator ≥ `fixedDt`:
   - `applyInput(cmd, fixedDt)` — throttle ramp, angular velocity update, orientation update.
   - `stepShip(ship, bodies, { dt: fixedDt, substeps: substepsPerTick })` — physics.
   - Snapshot `ship.lastImpact` if present and not already captured (first impact per frame wins).
   - `state.time += fixedDt`.
   - `accumulator -= fixedDt`.
6. Fold captured impact into `state.events.impact` + `.landed`/`.crashed`.
7. Edge-triggered `fuelEmpty` via `lastFuelMass` tracking.
8. Refresh `state.trajectory` if `trajCounter >= trajEveryNFrames` **or** input changed.
9. Return `state.events`.

**Input model — constants at the top of `engine.ts`:**

```
THROTTLE_UP_RATE    = 1 / 0.25 = 4    (full throttle in 0.25 s)
THROTTLE_DOWN_RATE  = 1 / 0.5  = 2    (empty in 0.5 s)
ANG_ACC             = 6               (rad/s²)
ANG_MAX             = 3               (rad/s cap)
ANG_DECAY_HALF_LIFE = 1.2             (s, coast-down when keys released)
ANG_MIN_SNAP        = 0.01            (rad/s, snap to zero below this)
MAX_FRAME_DT        = 0.1             (s, max accepted dt in one update)
```

**Throttle behavior:**
- While `cmd.thrust` is true and `fuelMass > 0`: throttle ramps toward 1 at `THROTTLE_UP_RATE`.
- Otherwise: throttle ramps toward 0 at `THROTTLE_DOWN_RATE`.
- Linear ramp per tick.
- The engine reads `ship.fuelMass > 0` directly — when fuel hits 0, throttle ramps down regardless of input.

**Rotation behavior:**
- While left or right held: `angularVelocity += dir × ANG_ACC × dt`, clamped to `±ANG_MAX`.
- When neither held: `angularVelocity *= 0.5^(dt / ANG_DECAY_HALF_LIFE)`. Snaps to 0 below `ANG_MIN_SNAP`.
- `orientation += angularVelocity × dt`.

**Determinism invariant:** Two engines with the same `seed`, fed the same `(dt, ShipCommand)` sequence, produce identical `GameState` and events. Anything that breaks this — a `Math.random()` call, an unordered iteration, a hidden timestamp — is a bug.

**Why first-impact-wins:** Within one `update()`, multiple `stepShip` calls may each produce a `lastImpact`. Without the snapshot, only the *last* impact would be seen — so a ship that bounced off terrain and then landed softly would report the soft landing, hiding the crash. First-impact-wins ensures the initial event is what game code reacts to.

---

### Game-side integration — the whole API in one snippet

```ts
import { GameEngine } from './game/engine';
import { KeyboardInput } from './game/input';

const engine = new GameEngine(bodies, ship, moon);
const input = new KeyboardInput();
input.attach();

let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;

  const events = engine.update(dt, input.read());

  if (events.crashed)   onCrash(events.impact!);
  if (events.landed)    onLanded(events.impact!);
  if (events.fuelEmpty) onFuelEmpty();

  const rel = engine.speedRelativeToTarget();
  const hud = rel
    ? `approach ${formatSpeed(-rel.radial)} · drift ${formatSpeed(rel.tangential)}`
    : `speed ${formatSpeed(engine.state.ship.velocity.mag())}`;

  render(engine.state);
  drawHud(hud);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

**Contract:**
- **In:** `engine.update(dt, ShipCommand)` — nothing else.
- **Out:** `engine.state` (read-only) + return value (events).
- **Control:** `engine.setPaused()`, `engine.setTarget()`, `engine.rng` (forked).
- **No rendering, no input reading, no DOM inside `engine.ts`.**

---

### Adding randomness to gameplay — the correct pattern

When you add asteroid spawning, random events, or any other gameplay randomness, **fork the engine's RNG once per subsystem** and consume the fork:

```ts
class AsteroidSpawner {
  private rng: Rng;
  constructor(engineRng: Rng) {
    this.rng = engineRng.fork();   // ← fork once at construction
  }
  spawn() {
    const pos = new Vec2(this.rng.range(-1e9, 1e9), this.rng.range(-1e9, 1e9));
    const radius = this.rng.range(500, 5000);
    // ...
  }
}
```

If you `spawner.rng.next()` directly from `engine.rng`, adding visual effects elsewhere will silently shift spawn timing. Fork. Always.

---

### What `game/` does NOT do

- Read the keyboard (only `input.ts` does, and only to build a `ShipCommand`).
- Render anything (no canvas, no WebGL, no DOM).
- Load assets.
- Handle multiplayer networking.
- Manage audio.
- Integrate planet motion (planets are effectively static; `Body.velocity` is used only in contact math).
- Include random event spawning (deferred — the RNG hook is there, the content is not).
- Include save/load (deferred — `engine.rng.seed` and `GameState` fields suffice for a future snapshot helper).
- Include `escaped` detection (field exists on `ShipEvents`, engine leaves it `false`; criterion TBD).
- Include time warp or slow-motion (explicitly out of scope).

---

### Extending the game layer

**To add a new event** (e.g. `landedOnSpecificBody`): add the boolean to `ShipEvents`, populate in `foldEvents`, add `emptyEvents` default, add to `hasAny`. Do not create a parallel event system.

**To add a new control** (e.g. brake): add a boolean to `ShipCommand`, add to `commandsEqual`, use in `applyInput`, add to `KeyboardInput.read()` and `DEFAULT_KEY_MAP`. Do not read the keyboard from `engine.ts`.

**To add a new state field** (e.g. camera target): add to `GameState` interface, initialize in `GameEngine` constructor. If it needs mutation, add a setter method on `GameEngine` — do not let callers mutate `state` directly.

**To add a new formatter** (e.g. `formatTorque`): add to `game/units.ts`. It's the only file with display logic.

**To add a new physics quantity** (e.g. angular momentum): that belongs in `sim/physics.ts`, not `game/`. `game/` re-exports or wraps; it does not reimplement.

---

### API surface for application code

If you're building the rendering/UI layer, the entire contract is:

```ts
// Construct once
const engine = new GameEngine(bodies, ship, target, cfg);

// Per frame
const events = engine.update(dt, command);

// Read state
engine.state.ship.position          // Vec2 (m)
engine.state.ship.velocity          // Vec2 (m/s)
engine.state.ship.orientation       // radians
engine.state.ship.angularVelocity   // rad/s
engine.state.ship.mass              // kg
engine.state.ship.fuelMass          // kg
engine.state.ship.throttle          // 0..1
engine.state.bodies                 // Body[]
engine.state.target                 // Body | null
engine.state.time                   // s
engine.state.trajectory.points      // Vec2[]
engine.state.trajectory.impact      // TrajectoryImpact | null
engine.state.events                 // ShipEvents (same as return value)
engine.state.paused                 // boolean

// Derive HUD values
engine.speedRelativeToTarget()      // { radial, tangential, speed, normal } | null

// Control
engine.setPaused(true);
engine.setTarget(mars);
```

That's it. Everything else is inside those fields. If the rendering layer needs a value that isn't here, the correct place to add it is `GameState` (with a matching setter or fold), not a parallel data structure in the renderer.