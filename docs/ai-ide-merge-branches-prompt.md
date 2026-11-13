# Prompt for the AI IDE: merge the `Game&engine` branch into the main skeleton

Paste everything below the line into your AI IDE.

---

## TASK

Our team works from a shared TypeScript skeleton on `main`. The **economy/logic owner** already merged their work into `main`. The **physics/flight owner** did not build on the skeleton and pushed their work to a separate branch named **`Game&engine`**. Your job: understand the project scope, inspect that branch, and **merge it into the project so everything works together**, without losing either person's work.

## STEP 0: UNDERSTAND THE SCOPE FIRST

Before touching git, read these on `main`:
1. `docs/CONCEPT.md` (the full game design: contracts, builder, ascent/transit/descent/landing with a bullseye, scavenging, economy, wear, streaks, difficulty modes).
2. `src/types.ts` (the shared contract, **frozen**: do not rename or remove anything).
3. `docs/CONTRACTS.md`, `docs/CONVENTIONS.md`, `docs/WORKING_AGREEMENT.md`.
4. `src/sim/` (the stubs the physics owner was supposed to replace) and `src/economy/` (real logic now).

Conventions to respect: SI units, money in USD millions, pure functions, seedable RNG from `src/core/rng.ts`, no `any`, kebab-case files, no default exports, difficulty values `'easy' | 'normal' | 'hard' | 'sandbox'`, difficulty modifiers from `src/config/constants.ts`.

## STEP 1: INSPECT THE BRANCH (read only)

Branch names with `&` must be quoted in the shell. Use single quotes everywhere.

```bash
git fetch --all --prune
git branch -a                                    # confirm the exact name and casing
git log --oneline --graph --decorate -n 30 --all
git merge-base main 'origin/Game&engine'         # empty output means unrelated histories
git diff --stat main...'origin/Game&engine'
```

Then report to yourself (and later to me): what the branch contains, which stack it uses (bundler, language, extra dependencies, any game framework), what files overlap with `main`, and how its flight code is structured (state, controls, physics step, rendering).

## STEP 2: SAFETY

- Do not force-push. Do not rewrite `main`.
- Create a backup tag first: `git tag backup/pre-merge-main main`.
- Do all work on a new branch: `git switch -c integration/game-engine main`.

## STEP 3: MERGE STRATEGY

**Case A: the branch shares history with `main`** (merge-base exists):
```bash
git merge --no-ff 'origin/Game&engine'
```
Resolve conflicts with the rules in Step 4.

**Case B: unrelated histories or a different project layout** (merge-base empty, or the branch has its own scaffold):
Do **not** use `--allow-unrelated-histories`. Instead bring the physics owner's source files into the skeleton's structure, keeping authorship in the commit message:
```bash
git checkout 'origin/Game&engine' -- <their sim/physics/flight files>
```
Place them under `src/sim/` (logic) and `src/ui/screens/flight.ts` (canvas and HUD), then adapt them to the shared contract (Step 5). Copy assets they need into `public/` or `src/ui/`.

## STEP 4: CONFLICT RULES

| Area | Rule |
|---|---|
| `src/types.ts` | `main` wins. If their code needs extra fields, add **optional fields only**, and list each one in the final report |
| `src/economy/**` | `main` wins (it is the economy owner's real logic) |
| `src/sim/**` | The branch wins (it is the physics owner's real logic), adapted to the contract |
| `src/ui/screens/flight.ts` | Use the branch's canvas and controls, wired to the store and router |
| `src/config/**` | Merge both. Keep difficulty settings from `main`, use them from the sim |
| `package.json` | Merge dependencies. Keep the skeleton's scripts. If the branch added a library (for example a game engine), keep it only if it is actually imported, and mention it in the report. Then run `npm install` and let the lockfile regenerate (never hand-merge `package-lock.json`) |
| Docs | Keep both. Update `docs/CONTRACTS.md` and `docs/DATA_AND_ASSUMPTIONS.md` with anything new |
| Tests | Keep all tests from both sides. Fix them if they break, do not delete them |

Never silently drop a file from either side. If something is duplicated, keep one, and note it in the report.

## STEP 5: ADAPT THE SIM TO THE SHARED CONTRACT

The rest of the game calls these exact signatures. They must exist in `src/sim/` and work with the real economy code:

```ts
export function createFlightSim(stats: ShipStats, body: Body, difficulty: Difficulty, seed: number): FlightSim;
export function autoFly(sim: FlightSim): FlightResult;
export function ringForDistance(distanceM: number, difficulty: Difficulty): number;   // 0 = miss, 1..5, 5 = bullseye
export function classifyTouchdown(vy: number, vx: number, tiltDeg: number, limits: ShipStats['touchdownLimits']): 'soft' | 'rough' | 'crash';
export function rollMalfunctions(design: ShipDesign, difficulty: Difficulty, seed: number): MissionEvent[];
```

Use the `FlightSim`, `FlightState`, `FlightControls` interfaces as defined in the skeleton. Check each of these:

- Inputs come only from `ShipStats` and `Body` (thrust, fuel mass, total mass, `touchdownLimits`, `controlAuthority`, gravity, atmosphere). Remove any hard-coded ship or planet values from their code.
- Output is a full `FlightResult`: outcome (`soft | rough | crash | abort`), `landingRing`, `distanceFromTargetM`, touchdown velocities and tilt, `fuelLeftKg`, `ascentFuelUsedPct`, `corrections`, and `events` as `MissionEvent[]`.
- Landing ring sizes use `landingRingScale` from `getDifficultySettings`.
- Malfunctions only when `malfunctionsOn` is true, and only through the seeded RNG so results are reproducible.
- Atmosphere (drag, entry heat) respects the `atmosphere` feature flag and uses `body.atmosphere` (`null` means airless).
- Units are SI. Convert at the edges only (for example pixels to metres inside the renderer).
- If they report max heat, add the optional `maxHeatMJ?` to `FlightResult` (and `heatCapacityMJ?` to `ShipStats`, if the builder owner has not already) so the report can use it.
- Physics must be deterministic for the same `seed`. Replace any `Math.random()` with `src/core/rng.ts`.

Keep their keyboard controls and canvas rendering, but move rendering code out of the physics module so `src/sim/` stays pure and testable.

## STEP 6: WIRE IT INTO THE GAME LOOP

- `src/state/flow.ts` and `runMockMission()` should now use the **real** `createFlightSim` and `autoFly` instead of the mock flight result, so the mock mission runs through real physics, real economy and the report.
- The flight screen runs the sim in real time with the player's controls, then stores the `FlightResult` in the store and moves to the next phase (`scavenge` if not crashed, otherwise `results`).
- The economy's `computePayout`, `updateStreaks`, `applyWear` and `simulateScavenge` must receive the real `FlightResult`.

## STEP 7: VERIFY

Run all of these, fix failures, and do not finish until they pass:
```bash
npm install
npm run typecheck && npm run lint && npm test && npm run build
```
Also add tests that prove the integration:
1. Same stats, body, difficulty and seed give an identical `FlightResult` twice.
2. A well-built Moon ship (use the starter preset or mock design) lands `soft` with `autoFly`.
3. An underpowered ship (TWR below 1) crashes.
4. A `FlightResult` from the real sim goes through `computePayout` and `generateReport` without errors.
5. Higher difficulty shrinks the landing ring (same distance gives an equal or lower ring).

Then run the dev server, open the app, and confirm the debug bar's "Run mock mission" completes the whole loop with real physics.

## STEP 8: FINISH

1. Commit in logical steps with clear messages (for example `merge: bring physics owner's flight code into src/sim`, `fix: adapt sim to shared types`).
2. Push **`integration/game-engine`**, not `main`. Do not merge to `main` yourself. I will review and merge.
3. If there are things you could not resolve safely, stop and list them instead of guessing.

## FINAL REPORT

Reply with:
1. What the branch contained (stack, key files, dependencies).
2. Which merge strategy you used (A or B) and why.
3. Every conflict and how you resolved it.
4. Any additions to `src/types.ts`, new dependencies, or changes to other owners' files.
5. Anything removed or left out, and why.
6. Test and build results.
7. Open issues the physics owner or team must handle (for example balance values, controls, missing features such as atmosphere or malfunctions).
