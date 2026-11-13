# Builder Owner Guide (Owner 2)

**Folders you own:** `src/builder/` (logic) and the hangar screen logic in `src/ui/screens/hangar.ts` (coordinate styling with the UI owner).

## 1. What the builder is

The builder is where the player turns a contract into a spaceship. It has two jobs:

1. **Logic:** turn a `ShipDesign` (parts plus the slider values the player chose) into a `ShipStats` object. The flight sim, economy, report and tutorial hints all read that object.
2. **Screen:** let the player pick parts, tune sliders, and see live meters that explain the consequences of every choice.

This is the heart of the challenge's "design a spacecraft and manage trade-offs" requirement, so clear feedback matters as much as correct maths.

## 2. Your two functions

```ts
// src/builder/compute-ship-stats.ts
export function computeShipStats(design: ShipDesign, catalog: PartDef[], body: Body): ShipStats;

// src/builder/validate-design.ts
export function validateDesign(design: ShipDesign, stats: ShipStats, contract: Contract): string[];
```

Both must be **pure** (no global state, no randomness, no DOM). They are called on every slider movement, so keep them fast.

## 3. How to compute each `ShipStats` field

All formulas are game-balanced starting points. Keep them simple, monotonic (more of a thing always means more of its effect) and document them in `docs/CONTRACTS.md`.

| Field | How to compute |
|---|---|
| `dryMassKg` | Sum of every part's mass after applying its parameter scaling |
| `fuelMassKg` | Sum of fuel capacity from tanks (scaled by their params) |
| `totalMassKg` | `dryMassKg + fuelMassKg` |
| `thrustN` | Sum of engine thrust (scaled by params) |
| `deltaVms` | Rocket equation: `Isp × g0 × ln(totalMass / dryMass)`, using the thrust-weighted average Isp of the engines. `g0 = 9.80665` from `config/constants.ts` |
| `twr` | `thrustN / (totalMassKg × body.gravityMs2)` |
| `powerGenW` | Solar area × base flux × `body.solarFlux` (game value for W per m²), plus any RTG output |
| `powerDrawW` | Sum of `basePowerW` of powered parts (instruments, comms, computer) after scaling |
| `batteryWh` | Sum of battery capacity |
| `dataGenKbps` | Sum of instrument data rates |
| `downlinkKbps` | From comms parts (antenna size scales rate, and also power draw and mass) |
| `dataBufferMB` | Computer/storage capacity (a simple game value is fine) |
| `costM` | Sum of part costs after scaling (build cost only, launch cost is the economy owner's) |
| `reliability` | Product of `(1 − failureChance(part))` for every part, using `failureChance` from `src/economy/wear.ts` so wear and reliability never disagree |
| `controlAuthority` | 0–1 from RCS thrust relative to mass, engine gimbal range, and computer assist level (clamp to 0–1) |
| `touchdownLimits` | `maxVyMs` rises with shock absorber stiffness and footpad size, `maxTiltDeg` rises with footpad width relative to leg length, `maxVxMs` follows the same logic |
| `warnings` | Soft problems (for example TWR between 1.0 and 1.05, negative power balance) |
| `violations` | Hard problems that block launch (see section 4) |
| `valid` | `violations.length === 0` |

**Parameter scaling:** each `PartDef` lists `params` (3–5 sliders with `min`, `max`, `default`, `explain`). Decide with the data owner what each parameter key does (for example `thrustScale` multiplies thrust and mass, `efficiency` trades thrust for Isp). Keep the key names stable. A good rule: bigger always costs more mass and money.

**Trade-offs your formulas must show (from the concept file):**
- More engines or bigger engines: more thrust and control, more mass and fuel burn.
- More fuel: more Δv but more mass, so diminishing returns.
- Efficiency vs thrust: high-Isp engines have low thrust.
- Bigger antenna: more downlink but more mass and power.
- Longer, wider legs: more stable but heavier.
- Worn parts: lower reliability.

## 4. Validation rules (`validateDesign` and `violations`)

Return a clear, plain-language message for each problem. Block launch (`valid = false`) when:

- there is no engine, no tank, or no landing legs
- total cost is over the contract budget cap (apply the difficulty `budgetModifier`; skip the check when `unlimitedFunds` is true, which is Sandbox)
- TWR is below 1.0 at the target body (cannot land)
- a required instrument kind from the contract is missing
- instruments exist but downlink is zero
- power balance is negative with no battery to cover the mission
- a part is incompatible with the body (use `getLockReason(part, body)` from `src/data/tutorial.ts`)

Ask the team whether a **mass limit** is needed (the contract type has only a budget cap). If yes, propose adding an optional `massLimitKg` to `Contract` and tell everyone; do not change `types.ts` silently.

Show the hint messages from `getActiveHints` only on Easy (`helpLevel === 'hints'`). Tooltips on Normal, nothing extra on Hard.

## 5. The hangar screen

The screen must let the player:

1. See the contract brief (objective, budget cap, body, required instruments).
2. Browse parts by category and add or remove them.
3. Tune each part's sliders using the `ParamSpec` values (min, max, step, unit) with the `explain` text as a tooltip.
4. Watch a **live meter panel** update on every change: total mass, Δv, TWR, power balance, data generated vs downlink, cost vs budget cap, reliability. Use the shared `meter` component. Use clear colours (green, amber, red).
5. See warnings and violations listed in plain language.
6. See each owned part's **condition** and a **Repair** button (calls `repairPart` from the economy module), so wear and repair are visible.
7. Use a **starter design preset** (a known-good Moon ship) so a new player and the rest of the team can always reach a working build in one click.
8. Save the current design to the save game and continue to pre-flight. The "Continue" button stays disabled while `valid` is false.

Locked parts are shown greyed out with the reason text, not hidden. That teaches the player why.

Show a simple ship preview (even a stacked-block or 2D side diagram that grows as parts are added). It does not need 3D.

## 6. What you depend on and who depends on you

| Person | What you need from them | What they need from you |
|---|---|---|
| Data owner | `parts.json` and `bodies.json` early, with stable param keys | Tell them which parameter keys and stats your formulas read |
| Sim owner | Nothing | A correct `ShipStats`: `thrustN`, `fuelMassKg`, `totalMassKg`, `touchdownLimits`, `controlAuthority` |
| Economy owner | `failureChance`, `repairPart` | `costM`, `reliability` |
| Report owner | Nothing | Complete `ShipStats` including `twr` and `touchdownLimits` |
| UI owner | Styling, shared components | Hangar screen logic and the list of meters to show |

Until a dependency lands, **build against `src/mocks/` and the starter JSON**. Never wait.

## 7. Suggested order of work

| Time | Task |
|---|---|
| Hour 1 | Pull the framework, read `docs/CONTRACTS.md`, read `parts.json` as it stands |
| Hours 1–3 | Real `computeShipStats` for mass, fuel, Δv, TWR, cost, with tests |
| Hours 3–5 | Hangar screen with part list, sliders and live meters wired to the store |
| Hours 5–7 | Power, data, comms, reliability, touchdown limits; validation rules; locks and hints |
| Hours 7–8 | Starter preset, repair button, save design; hand a working build to the sim owner |
| After integration | Balance with the data owner: a basic ship must land on the Moon within budget |

## 8. Tests to write (Vitest)

- Adding fuel raises Δv but lowers TWR
- Doubling engine thrust doubles `thrustN` and raises mass
- Δv matches a hand-calculated rocket equation example
- Higher gravity lowers TWR
- Over-budget design gets a violation (and does not in Sandbox)
- Missing required instrument gets a violation
- Negative power balance gets a warning or violation as designed
- A worn part lowers `reliability`
- Same inputs always give the same output

## 9. Acceptance checklist

- [ ] `computeShipStats` and `validateDesign` have the exact signatures above and are pure
- [ ] Every `ShipStats` field is computed (nothing left at a placeholder)
- [ ] Meters update live on every slider change without lag
- [ ] A new player can reach a valid Moon ship in one click (starter preset) and can also build one by hand
- [ ] Incompatible parts are greyed out with a reason
- [ ] Violations block the Continue button, warnings do not
- [ ] Difficulty changes behaviour (budget modifier, hints on Easy only)
- [ ] Formulas are documented in `docs/CONTRACTS.md`
- [ ] Typecheck, lint, tests and build pass

## 10. Common mistakes to avoid

- Reading values directly from JSON in the UI instead of going through `computeShipStats`.
- Using a different failure formula than the economy owner's, so reliability and wear disagree.
- Hiding locked parts instead of explaining them.
- Changing `types.ts` or param keys without telling the team.
- Letting the builder become a second source of truth for money (the payout formula belongs to the economy owner).
