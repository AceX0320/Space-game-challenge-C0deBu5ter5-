# Prompt for the AI IDE: merge the content member's work into the framework

Paste everything below the line into your AI IDE. If the scaffold from the setup prompt is still being built, let it finish first, then give this.

---

## TASK

The team's content owner wrote three plain-JavaScript files: **Difficulty.js**, **Report.js** and **Tutorial1.js** (they may be attached to this message or sit in the repo, for example under `lib/`). Convert and merge them into our TypeScript framework so they use the **shared types in `src/types.ts`**, follow `docs/CONVENTIONS.md`, and plug into the existing stubs. Keep the content owner's good wording and structure. Fix the problems listed below.

Rules that apply to everything:
- Use only types from `src/types.ts`. Do not rename or remove any existing type. If you must add something, add **optional fields only** and list every addition in your final report.
- No `any`, kebab-case file names, no default exports, pure functions, units as in `docs/CONVENTIONS.md` (money in USD millions, data in MB/kbps, SI units).
- Only touch the files named here, plus the minimal wiring and tests described. Do not edit other owners' logic beyond the one-line call-site changes listed.
- Every fact or number shown to players gets a `source`: `'nasa'`, `'game'` or `'fictional'`.
- Add Vitest tests for each converted module.
- When the ported files work, delete the old `.js` originals so there are no duplicates.
- Finish with `npm run typecheck && npm run lint && npm test && npm run build` passing.

## 1. Difficulty → `src/config/constants.ts`

Port `DIFFICULTY_CONFIG` as a typed `Record<Difficulty, DifficultySettings>` and export `getDifficultySettings(level: Difficulty = 'normal')`.

```ts
export interface DifficultySettings {
  budgetModifier: number;     // multiplies the contract budget cap
  unlimitedFunds: boolean;    // true only for sandbox
  wearRate: number;           // multiplies per-mission wear
  malfunctionsOn: boolean;
  landingRingScale: number;   // >1 = bigger bullseye rings
  helpLevel: 'hints' | 'tooltips' | 'minimal';
}
```

Values to keep from the original: easy (1.5, wear 0, no malfunctions, ring 1.5, hints), normal (1.0, wear 1.0, no malfunctions, ring 1.0, tooltips), hard (0.8, wear 1.75, malfunctions on, ring 0.6, minimal).
**Add sandbox:** `unlimitedFunds: true`, `budgetModifier: 1`, wear 0, malfunctions off, ring 1.0, help `'hints'`.
Use lowercase difficulty keys (`'easy' | 'normal' | 'hard' | 'sandbox'`) to match `Difficulty`. Keep the explanatory comments from the original.

**Wiring (one-line changes, with `// TODO(owner-N)` where logic is still a stub):**
- `src/sim/landing.ts` `ringForDistance`: use `landingRingScale` to scale ring radii.
- `src/economy/wear.ts` `applyWear`: multiply by `wearRate`.
- `src/sim/malfunctions.ts` `rollMalfunctions`: return `[]` when `malfunctionsOn` is false.
- `src/economy/payout.ts`: apply `budgetModifier` / `unlimitedFunds` where the budget cap is read.

## 2. Report → `src/report/generate-report.ts`

Signature is fixed:

```ts
export function generateReport(
  contract: Contract, stats: ShipStats, result: MissionResult, payout: PayoutResult
): MissionReport;
```

Keep the original idea (headline, root causes, suggested changes, timeline, NASA reference), but fix these bugs and mismatches:

1. **Payout:** do not recompute money. Read everything from `PayoutResult` (owned by `economy/payout.ts`). The report may add one `info` item summarising net result.
2. **Outcome:** use `FlightOutcome` (`soft | rough | crash | abort`) from `result.flight.outcome`. Never let a later check overwrite a crash. Evaluate causes in this priority order and stop downgrading once the mission is a crash: heat, touchdown speed/tilt, fuel, surface operations, data.
3. **Heat:** add optional `heatCapacityMJ?: number` to `ShipStats` and `maxHeatMJ?: number` to `FlightResult`. If both are set and max heat exceeds capacity, report a burn-up cause and suggest a larger heat shield for that body. List both additions in the final report.
4. **Touchdown:** compare `touchdownVyMs`, `touchdownVxMs` and `touchdownTiltDeg` with `stats.touchdownLimits` (`maxVyMs`, `maxVxMs`, `maxTiltDeg`). Handle the rough landing case (limit exceeded slightly: parts damaged, reduced science).
5. **Specific advice, not always "add stronger engines":** pick the suggestion from the actual cause: speed over leg limit and `stats.twr` low → stronger engines or less mass; speed over limit with enough thrust → stiffer shock absorbers or more fuel margin; tilt over limit → wider or longer legs or more RCS; fuel nearly zero → bigger tank or more efficient engine.
6. **Power loss:** use `result.scavenge?.endedBy === 'power'`. Suggest more batteries or an RTG, citing the body's `solarFlux` where it applies.
7. **Data:** use `dataGeneratedMB` and `dataSentMB` from `ScavengeResult` (not item counts versus a rate). If sent < generated, report lost data with the lost MB and suggest a bigger antenna or fewer instruments.
8. **No scavenge result:** when `result.scavenge` is `null` (crash), skip surface causes without throwing. Never access `.length` of something that may be undefined.
9. **Timeline:** build it from `result.flight.events` plus `result.scavenge?.events`, sorted by `tS`. Remove the hard-coded lines (for example "Atmospheric exit" must not appear on the Moon). Format times as `T+m:ss`.
10. **NASA reference:** replace the always-Mars-Polar-Lander note with a small lookup table in the same file, chosen by cause, each entry labelled `source: 'nasa'` with a short factual note:
    - touchdown speed / engine cutoff problem → Mars Polar Lander (1999): lost during landing; the investigation traced it to premature engine shutoff.
    - successful powered landing with parachute → Phoenix (2008).
    - comms bottleneck → Galileo (antenna failed to deploy, forcing low-rate communication and data compression).
    - power loss → Opportunity (2018 dust storm ended the mission).
    No reference when none fits. Add a `// VERIFY:` comment above each entry so a human checks the wording before the demo.
11. **Status text:** map outcome and issues to plain-language headlines (for example "Soft landing, data partly lost", "Crash: touched down too fast", "Mission aborted"). Put that in `headline`.

Tests (Vitest) must cover: soft landing with no issues, rough landing, crash by speed, crash by tilt, crash that is *not* overwritten by a power failure, `scavenge: null`, data lost, power lost, burn-up, and timeline ordering.

## 3. Tutorial → `src/data/tutorial.ts`

Port the content with these changes:

- **Stat tooltips:** keep `mass`, `twr`, `powerBalance`, `deltaV`, typed as `Record<string, { label; explanation; nasaFact?; source }>`.
- **Active hints:** replace string conditions with functions. Example:

```ts
export interface HintContext { stats: ShipStats; body: Body; contract: Contract; design: ShipDesign; catalog: PartDef[]; }
export interface ActiveHint { id: string; when: (ctx: HintContext) => boolean; message: string; }
```

  Port: low TWR (`stats.twr < 1.05`), data generated above downlink (`stats.dataGenKbps > stats.downlinkKbps`), and solar power at a body with very low `solarFlux` (for example `< 0.1`, which covers Titan). Export `getActiveHints(ctx): string[]` and show hints only when `getDifficultySettings(difficulty).helpLevel === 'hints'`.
- **Lockouts:** replace string triggers with `getLockReason(part: PartDef, body: Body): string | null`. Use `body.atmosphere === null` for the parachute-on-airless-body rule, and `body.solarFlux < 0.4` for solar panels past Mars. The original used `distanceFromSun`, which does not exist in our types.
- **Onboarding:** our builder uses **sliders and part slots, not drag-and-drop**, so reword the builder steps (for example "Pick an engine and tune its thrust and efficiency; watch the Thrust-to-Weight ratio turn green"). Type each step as `{ phase: GamePhase; targetUI: string; message: string }`, using the real `GamePhase` values (`'hangar'`, `'preflight'`, `'flight'`, `'scavenge'`, `'results'`). The ascent step is still an **open design decision** (automated or player-flown), so write it neutrally and add `// TODO(owner-4): confirm ascent decision with the team`.
- **`targetUI` ids:** document in `docs/CONVENTIONS.md` that UI elements expose `data-tutorial="<id>"` attributes, and list the ids used (`contract-brief`, `parts-menu`, `throttle-slider`, `skip-transit-btn`). Add a `// TODO(owner-5): add these attributes` note in the relevant screen files.
- **Gameplay guide:** keep all five entries, add one short entry for **difficulty modes and Sandbox**, and one for **team roles** if the feature flag `teamMode` exists.
- **Facts to verify:** keep the "Tyranny of the Rocket Equation" fact, the Saturn V liftoff thrust-to-weight of about 1.16, and the roughly 9,400 m/s Δv to low Earth orbit, each with `source: 'nasa'` and a `// VERIFY:` comment.

## 4. Docs

- Update `docs/DATA_AND_ASSUMPTIONS.md` with every new number and fact (difficulty modifiers as `game`, NASA facts as `nasa` with the verify note).
- Update `docs/CONTRACTS.md` for `generateReport`, `getDifficultySettings`, `getActiveHints`, `getLockReason`, and the two optional type additions.

## FINAL REPORT

Reply with: (1) files created, changed and deleted; (2) every addition to `types.ts`; (3) anything you changed in other owners' files; (4) which `// VERIFY:` and `// TODO(owner-N)` items humans must handle; (5) confirmation that typecheck, lint, tests and build pass.
