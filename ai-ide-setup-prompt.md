# Prompt for the AI IDE: Hour 0–1 project setup

Copy everything below the line into your AI IDE. Attach `space-mission-design-game-concept.md` to the same message.

---

## ROLE

You are a senior TypeScript engineer setting up the shared foundation of a hackathon game for a team of 6 who will work in parallel for about 24 hours. Your job in this session is **scaffolding only**: structure, shared contracts, stubs with mock data, tooling, docs and deployment. **Do not implement real gameplay.** Everything you create must let six people start coding at the same time without waiting on each other.

## PROJECT CONTEXT

- Event: NASA Space Apps Challenge 2026, challenge **"Space Mission Design Game"**.
- Repository: https://github.com/AceX0320/Space-game-challenge-C0deBu5ter5-
  (Inspect it first. If it already contains files, keep anything useful, do not delete existing work, and report what you found. Note the repo name ends with a hyphen. Detect the exact name from `git remote` rather than guessing.)
- Deliverable: a **web game** that runs from a single static link (no backend, no install for judges).
- Team: 6 people, under 24 hours total. Hour 0–1 is this setup.
- The attached file `space-mission-design-game-concept.md` is the **full design and scope**. Read it completely before writing anything. Copy it to `docs/CONCEPT.md`. If anything in this prompt conflicts with it, the concept file wins on *game design* and this prompt wins on *technical decisions*. List any conflict you notice in your final report.

### The game in brief (details are in the concept file)

The player picks a **contract** (a planet or moon with a science objective), **builds a spaceship** from parts with tunable parameters under budget/mass/power/data/lifetime limits, flies **ascent, transit, entry/descent and landing** (a bullseye target with ring scoring), then an **automatic scavenging phase** runs on a countdown timer and logs items found. The player gets paid (net of what they spent), must reach a **funding gate** to unlock the next contract, can **replay** earlier contracts with leaner builds, deals with **wear and tear**, **streak multipliers** (lost on failure), optional **malfunctions** (Hard), and can **research** found items to unlock new parts/resources. Modes: Easy, Normal, Hard, Sandbox (unlimited money). Team mode supports up to 4 players with roles. A post-mission report explains why the mission succeeded or failed.

## TECH DECISIONS (do not change)

- **Vite + TypeScript (strict)**, ES modules.
- **No UI framework.** Vanilla DOM for screens plus **Canvas 2D** for the flight view. Keep dependencies minimal.
- **Vitest** for unit tests. **ESLint + Prettier** with a light config (no `any`, no unused vars).
- State: a tiny typed store (`subscribe`, `getState`, `dispatch`-style actions) in `src/state/`. No external state library.
- Persistence: `localStorage` through a single save/load module.
- Data: static JSON files in `src/data/`, loaded and validated at startup.
- Path aliases: `@/` maps to `src/`.
- Node scripts in `package.json`: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`, `format`.
- Hosting: **GitHub Pages via GitHub Actions** (auto-deploy on every push to `main`). Set Vite `base` from the repository name automatically (use an env var set in the workflow, default `/` locally).

## UNITS AND CONVENTIONS (document in `docs/CONVENTIONS.md`)

- SI units everywhere in code: kg, N, s, m, m/s, W, Wh, degrees for angles stored as degrees.
- Money in **USD millions** (`costM`, `rewardM`). Data in **MB** (volumes) and **kbps** (rates).
- Game time may be scaled; always store real seconds of *simulated* time plus a clearly named `timeScale`.
- All game logic functions are **pure** (inputs in, outputs out, no hidden global state). Randomness only through a **seedable RNG** in `src/core/rng.ts`.
- Every number in the data files has a `source` field: `"nasa"` (real, with a note on where), `"game"` (invented for balance) or `"fictional"`.
- File and folder names in kebab-case. Types in PascalCase. No default exports.

## FOLDER STRUCTURE AND OWNERSHIP

Create exactly this structure. Each folder has an owner role so people rarely edit the same files.

```
/
├─ .github/
│  ├─ workflows/deploy.yml        # build + deploy to GitHub Pages
│  └─ CODEOWNERS                  # placeholders: @owner-1 ... @owner-6
├─ docs/
│  ├─ CONCEPT.md                  # copy of the attached concept file
│  ├─ CONVENTIONS.md
│  ├─ CONTRACTS.md                # explains every shared type and module interface
│  ├─ WORKING_AGREEMENT.md        # git rules, ownership, how to use mocks
│  ├─ DATA_AND_ASSUMPTIONS.md     # table: value, where used, source (nasa/game/fictional)
│  └─ TASKS.md                    # first tasks per person (see below)
├─ public/                        # static assets (placeholder favicon)
├─ src/
│  ├─ main.ts                     # bootstraps store, loads data, starts router
│  ├─ types.ts                    # SHARED CONTRACT (frozen after setup)
│  ├─ config/
│  │  ├─ constants.ts             # g0, difficulty multipliers, ring defaults
│  │  └─ feature-flags.ts         # atmosphere, malfunctions, streaks, research, teamMode, sandbox
│  ├─ core/                       # shared utilities (setup owner)
│  │  ├─ rng.ts
│  │  ├─ units.ts
│  │  └─ validate.ts              # validates JSON data against types at startup
│  ├─ data/                       # OWNER 4: content and data
│  │  ├─ parts.json
│  │  ├─ bodies.json
│  │  ├─ contracts.json
│  │  ├─ items.json
│  │  ├─ research.json
│  │  └─ index.ts                 # typed loaders
│  ├─ sim/                        # OWNER 1: flight and physics
│  │  ├─ flight-sim.ts
│  │  ├─ landing.ts
│  │  ├─ atmosphere.ts
│  │  ├─ malfunctions.ts
│  │  └─ flight-sim.test.ts
│  ├─ builder/                    # OWNER 2: ship builder logic
│  │  ├─ compute-ship-stats.ts
│  │  ├─ validate-design.ts
│  │  └─ compute-ship-stats.test.ts
│  ├─ economy/                    # OWNER 3: money, wear, streaks, research, scavenging
│  │  ├─ payout.ts
│  │  ├─ wear.ts
│  │  ├─ streaks.ts
│  │  ├─ funding-gate.ts
│  │  ├─ scavenge.ts
│  │  ├─ research.ts
│  │  ├─ save-load.ts
│  │  └─ economy.test.ts
│  ├─ report/                     # OWNER 6: explanations
│  │  ├─ generate-report.ts
│  │  └─ generate-report.test.ts
│  ├─ state/                      # OWNER 6: game flow and store
│  │  ├─ store.ts
│  │  ├─ actions.ts
│  │  └─ flow.ts                  # phase state machine
│  ├─ ui/                         # OWNER 5: screens and styling
│  │  ├─ router.ts
│  │  ├─ styles/
│  │  │  └─ base.css
│  │  ├─ components/              # shared small components (meter, panel, tooltip)
│  │  └─ screens/
│  │     ├─ home.ts
│  │     ├─ contracts.ts
│  │     ├─ hangar.ts             # builder UI
│  │     ├─ preflight.ts          # go/no-go
│  │     ├─ flight.ts             # canvas + HUD
│  │     ├─ scavenge.ts           # timer + live finds feed
│  │     ├─ results.ts            # score + report
│  │     ├─ research.ts
│  │     └─ team.ts               # roles and design-review flags
│  └─ mocks/                      # fake inputs everyone can build against
│     ├─ mock-design.ts
│     ├─ mock-ship-stats.ts
│     ├─ mock-flight-result.ts
│     ├─ mock-scavenge-result.ts
│     ├─ mock-mission-result.ts
│     └─ mock-save.ts
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ eslint.config.js
├─ .prettierrc
├─ .gitignore
└─ README.md
```

## SHARED CONTRACT: `src/types.ts`

Write this file first. It is the single source of truth. Use these definitions (you may add small fields if truly needed, but do not rename or remove anything, and list additions in the final report).

```ts
export type Difficulty = 'easy' | 'normal' | 'hard' | 'sandbox';
export type DataSource = 'nasa' | 'game' | 'fictional';

export type PartCategory =
  | 'engine' | 'tank' | 'rcs' | 'leg' | 'hull' | 'power'
  | 'comms' | 'computer' | 'instrument' | 'heatshield' | 'parachute';

export interface ParamSpec {
  key: string;            // e.g. "thrustScale"
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  explain: string;        // "why it matters" tooltip text
}

/** Catalog entry (static data). */
export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  source: DataSource;
  description: string;
  baseMassKg: number;
  baseCostM: number;
  basePowerW: number;           // positive = consumes, negative = generates
  baseWearPerMission: number;   // % condition lost per mission at Normal
  params: ParamSpec[];          // 3–5 tunable parameters
  stats: PartStats;             // category-specific base values
  unlocksBy?: string;           // research node id, if locked
}

export interface PartStats {
  thrustN?: number; ispS?: number; gimbalDeg?: number;        // engine
  fuelCapacityKg?: number;                                     // tank
  rcsThrustN?: number;                                         // rcs
  legLengthM?: number; footpadM?: number; shockStiffness?: number; // leg
  structureStrength?: number;                                  // hull
  solarAreaM2?: number; batteryWh?: number;                    // power
  downlinkKbps?: number; antennaGainDb?: number;               // comms
  assistLevel?: number;                                        // computer
  instrumentKind?: InstrumentKind; dataRateKbps?: number; scienceValue?: number; // instrument
  heatCapacityMJ?: number; dragAreaM2?: number; singleUse?: boolean; // heatshield / parachute
}

export type InstrumentKind = 'camera' | 'spectrometer' | 'drill' | 'seismometer' | 'weather';

/** A part placed in a design, with the player's chosen parameter values. */
export interface PartInstance {
  instanceId: string;
  partId: string;
  paramValues: Record<string, number>;
  condition: number;            // 0–100, persists between missions
  maxCondition: number;         // 0–100, falls with each repair
}

export interface ShipDesign {
  id: string;
  name: string;
  contractId?: string;
  parts: PartInstance[];
}

export interface ShipStats {
  totalMassKg: number;
  dryMassKg: number;
  fuelMassKg: number;
  deltaVms: number;
  thrustN: number;
  twr: number;                  // at the target body's gravity
  powerGenW: number;
  powerDrawW: number;
  batteryWh: number;
  dataGenKbps: number;
  downlinkKbps: number;
  dataBufferMB: number;
  costM: number;
  reliability: number;          // 0–1, from part condition
  controlAuthority: number;     // 0–1 from RCS, gimbal, computer
  touchdownLimits: { maxVyMs: number; maxVxMs: number; maxTiltDeg: number };
  warnings: string[];
  valid: boolean;
  violations: string[];         // e.g. "Mass exceeds limit"
}

export interface AtmosphereSpec {
  surfaceDensityKgM3: number;
  scaleHeightM: number;
}

export interface Body {
  id: string;
  name: string;
  source: DataSource;
  gravityMs2: number;
  atmosphere: AtmosphereSpec | null;
  baseLifetimeS: number;        // scavenge time before part/power effects
  solarFlux: number;            // relative to Earth = 1
  note?: string;
}

export interface Contract {
  id: string;
  title: string;
  bodyId: string;
  objective: string;
  requiredInstruments: InstrumentKind[];
  budgetCapM: number;
  rewardM: number;
  fundingGateM: number;         // total funds needed to unlock the next contract
  unlocksContractId?: string;
  bonusObjectives?: { id: string; text: string; extraRewardM: number }[];
}

export type FlightOutcome = 'soft' | 'rough' | 'crash' | 'abort';

export interface FlightResult {
  outcome: FlightOutcome;
  landingRing: number;          // 0 = miss, 1..5 where 5 = bullseye
  distanceFromTargetM: number;
  touchdownVyMs: number;
  touchdownVxMs: number;
  touchdownTiltDeg: number;
  fuelLeftKg: number;
  ascentFuelUsedPct: number;
  corrections: number;
  events: MissionEvent[];
}

export interface MissionEvent {
  tS: number;
  kind: 'info' | 'warning' | 'failure' | 'malfunction' | 'milestone';
  text: string;
  partInstanceId?: string;
}

export interface FoundItem {
  itemId: string;
  tS: number;
  quantity: number;
  transmitted: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  bodyIds: string[];
  requiresInstrument: InstrumentKind[];
  dataMB: number;
  scienceValue: number;
  source: DataSource;
  researchNodeId?: string;
}

export interface ScavengeResult {
  itemsFound: FoundItem[];
  dataGeneratedMB: number;
  dataSentMB: number;
  timeUsedS: number;
  timeAvailableS: number;
  endedBy: 'timer' | 'power' | 'part-failure' | 'data-full';
  events: MissionEvent[];
}

export interface MissionResult {
  contractId: string;
  difficulty: Difficulty;
  flight: FlightResult;
  scavenge: ScavengeResult | null;     // null if the ship crashed
  partWearDelta: Record<string, number>; // instanceId -> condition lost
  malfunctions: string[];
}

export type StreakTrack =
  | 'cleanAscent' | 'smoothHands' | 'pinpoint' | 'softTouch' | 'frugal';

export interface ScoreBreakdown {
  landing: number; science: number; efficiency: number;
  decisions: number; teamBonus: number; total: number;
}

export interface PayoutResult {
  grossRewardM: number;
  buildCostM: number;
  launchCostM: number;
  repairCostM: number;
  streakMultiplier: number;
  netM: number;
  isRecord: boolean;            // beat previous best net on this contract
  score: ScoreBreakdown;
}

export interface ResearchNode {
  id: string;
  name: string;
  branch: 'propulsion' | 'materials' | 'power' | 'science';
  costM: number;
  requiresItems: { itemId: string; quantity: number }[];
  requiresNodes: string[];
  unlocksPartIds: string[];
  description: string;
  source: DataSource;
}

export interface SaveGame {
  version: number;
  fundsM: number;
  difficulty: Difficulty;
  unlockedContractIds: string[];
  completedContracts: Record<string, { bestNetM: number; bestScore: number; plays: number }>;
  streaks: Record<StreakTrack, number>;
  safetyNets: number;
  inventory: { itemId: string; quantity: number }[];
  researched: string[];
  ownedParts: PartInstance[];   // the hangar
  currentDesign: ShipDesign | null;
}

export type TeamRole = 'director' | 'engineer' | 'science' | 'operations';

export interface DesignFlag {
  id: string;
  role: TeamRole;
  text: string;
  resolved: boolean;
  acceptedAsRisk: boolean;
}

export interface ReportItem {
  severity: 'good' | 'info' | 'warning' | 'critical';
  text: string;          // plain-language "why"
}

export interface MissionReport {
  headline: string;
  outcome: FlightOutcome;
  causes: ReportItem[];
  suggestions: string[];
  timeline: MissionEvent[];
  similarRealMission?: string;
}

export type GamePhase =
  | 'home' | 'contracts' | 'hangar' | 'preflight'
  | 'flight' | 'scavenge' | 'results' | 'research' | 'team';
```

## MODULE INTERFACES (stub every one)

Create each function with the exact signature below. Each stub must:
1. Return **plausible, deterministic mock values** (based on inputs where trivial, otherwise from `src/mocks/`).
2. Contain a `// TODO(owner-N): ...` comment describing what the real implementation must do, referencing the section of `docs/CONCEPT.md`.
3. Have at least one passing test.

```ts
// src/builder/compute-ship-stats.ts   (OWNER 2)
export function computeShipStats(design: ShipDesign, catalog: PartDef[], body: Body): ShipStats;
// src/builder/validate-design.ts      (OWNER 2)
export function validateDesign(design: ShipDesign, stats: ShipStats, contract: Contract): string[];

// src/sim/flight-sim.ts               (OWNER 1)
export interface FlightState {
  phase: 'ascent' | 'transit' | 'descent' | 'landing' | 'landed' | 'crashed';
  tS: number; xM: number; yM: number; vxMs: number; vyMs: number;
  tiltDeg: number; fuelKg: number; throttle: number; heatMJ: number;
}
export interface FlightControls { throttle: number; pitchRate: number; rcs: number; deployParachute: boolean; }
export interface FlightSim {
  state: FlightState;
  step(dtS: number, controls: FlightControls): FlightState;
  isDone(): boolean;
  result(): FlightResult;
}
export function createFlightSim(
  stats: ShipStats, body: Body, difficulty: Difficulty, seed: number
): FlightSim;
export function autoFly(sim: FlightSim): FlightResult;   // simple autopilot for testing/mocking

// src/sim/landing.ts                  (OWNER 1)
export function ringForDistance(distanceM: number, difficulty: Difficulty): number;
export function classifyTouchdown(
  vy: number, vx: number, tiltDeg: number, limits: ShipStats['touchdownLimits']
): 'soft' | 'rough' | 'crash';

// src/sim/malfunctions.ts             (OWNER 1)
export function rollMalfunctions(design: ShipDesign, difficulty: Difficulty, seed: number): MissionEvent[];

// src/economy/payout.ts               (OWNER 3)
export function computePayout(
  contract: Contract, result: MissionResult, stats: ShipStats,
  save: SaveGame, repairCostM: number
): PayoutResult;

// src/economy/wear.ts                 (OWNER 3)
export function applyWear(parts: PartInstance[], difficulty: Difficulty, usage: Record<string, number>): PartInstance[];
export function failureChance(part: PartInstance): number;   // 0–1
export function repairPart(part: PartInstance): { part: PartInstance; costM: number };

// src/economy/streaks.ts              (OWNER 3)
export function updateStreaks(
  streaks: SaveGame['streaks'], result: MissionResult, stats: ShipStats,
  contract: Contract, safetyNets: number
): { streaks: SaveGame['streaks']; safetyNets: number; multiplier: number };

// src/economy/funding-gate.ts         (OWNER 3)
export function nextContractUnlocked(save: SaveGame, contract: Contract): boolean;

// src/economy/scavenge.ts             (OWNER 3)
export function simulateScavenge(
  stats: ShipStats, body: Body, contract: Contract, flight: FlightResult,
  items: ItemDef[], difficulty: Difficulty, seed: number
): ScavengeResult;

// src/economy/research.ts             (OWNER 3)
export function canResearch(node: ResearchNode, save: SaveGame): boolean;
export function doResearch(node: ResearchNode, save: SaveGame): SaveGame;

// src/economy/save-load.ts            (OWNER 3)
export function loadSave(): SaveGame;
export function writeSave(save: SaveGame): void;
export function newSave(difficulty: Difficulty): SaveGame;

// src/report/generate-report.ts       (OWNER 6)
export function generateReport(
  contract: Contract, stats: ShipStats, result: MissionResult, payout: PayoutResult
): MissionReport;
```

## DATA FILES (starter content, OWNER 4 will expand)

Create valid, typed starter JSON so every screen has something to show. Every entry needs a `source` field.

- `bodies.json`: **Moon, Mars, Titan, Venus, a small asteroid/dwarf planet**. Gravity (m/s²) roughly 1.6, 3.7, 1.35, 8.9, 0.3. Atmosphere: none for Moon and asteroid; very thin (Mars), thick (Titan), extremely thick (Venus). Mark gravity values `"nasa"` with a note "verify against NASA Planetary Fact Sheet", everything else `"game"`.
- `parts.json`: at least **2 engines, 2 tanks, 1 RCS, 2 leg types, 1 hull, 2 power parts, 2 comms, 1 computer, 4 instruments (camera, spectrometer, drill, seismometer), 1 heat shield, 1 parachute**. All with 3–5 `params` and `explain` text. All `"game"`.
- `contracts.json`: **6 contracts** matching the campaign in section 10 of the concept file, with chained `unlocksContractId` and rising `fundingGateM`.
- `items.json`: **6–10 items** across the bodies (water ice, regolith, iron-rich rock, perchlorate salts, hydrocarbons, carbon-rich material, one fictional microbial find marked `"fictional"`).
- `research.json`: **a small tree** with 4 branches and about 8 nodes.
- `src/data/index.ts`: typed getters (`getBodies()`, `getParts()`, `getContracts()`, `getItems()`, `getResearch()`) that run `validate.ts` and throw a clear error message on bad data.

## GAME STATE, FLOW AND UI SHELL

- `src/state/store.ts`: typed store with `getState`, `subscribe`, `update(partial)`. State holds: `phase`, `save`, `activeContractId`, `design`, `stats`, `missionResult`, `payout`, `report`, `team` (roles and flags), `flags` (feature flags).
- `src/state/flow.ts`: phase state machine with the allowed transitions: `home → contracts → hangar → preflight → flight → scavenge → results → (research | contracts)`. Include a helper `runMockMission()` that executes the **whole loop using stubs and mocks** and ends on the results screen, so the team can see an end-to-end skeleton on minute one.
- `src/ui/router.ts`: renders the screen for the current phase and re-renders on state change. Include a **debug bar** (dev only) with buttons to jump to any phase and to run the mock mission.
- Each screen file exports `renderXxx(root: HTMLElement, state: GameState): void`, shows a title, the key data it will eventually display (from mocks), and a button to go to the next phase. **Placeholder only, no styling work.**
- `ui/components/`: tiny reusable pieces: `meter` (labelled bar), `panel`, `tooltip`.
- Add a visible **version/commit stamp** in the footer so the team can confirm the deployed build is current.

## FEATURE FLAGS

`src/config/feature-flags.ts` exports a typed object, all defaulting as shown, and readable from the store:

```
atmosphere: false, malfunctions: false, streaks: false,
research: false, teamMode: false, sandbox: true
```

Stubs must respect the flags (for example `rollMalfunctions` returns `[]` when off).

## TOOLING AND DEPLOYMENT

- `.github/workflows/deploy.yml`: on push to `main`, run install, `typecheck`, `lint`, `test`, `build`, then deploy `dist/` to GitHub Pages using the official Pages actions. Set the Vite base path from the repo name via an env var.
- `.github/CODEOWNERS`: map each folder to a placeholder (`@owner-1` … `@owner-6`) per the structure above.
- Add a `.gitignore` for node, dist, env files and editor folders.
- Do **not** commit secrets. The project has no backend and needs none.
- Note in `README.md`: one-time human step is enabling GitHub Pages with "GitHub Actions" as the source in the repository settings.

## DOCUMENTATION TO WRITE

1. **README.md**: what the game is (3–4 lines), how to run (`npm install`, `npm run dev`), scripts, folder map with owners, deployment link placeholder, link to `docs/`.
2. **docs/CONTRACTS.md**: for every type and every module function: what it means, units, who owns it, how to mock it, and an example.
3. **docs/CONVENTIONS.md**: units, purity, RNG, naming, data `source` rule.
4. **docs/WORKING_AGREEMENT.md**:
   - `types.ts` is frozen. To change it: announce in chat, edit in a tiny dedicated commit, everyone pulls.
   - Only edit your own folder. Need something from another folder? Ask, or use a mock.
   - Commit small and often straight to `main` (or a branch merged within an hour). `main` must always build and run.
   - Anything unfinished goes behind a feature flag.
   - Never block waiting: build against `src/mocks/`.
   - Run `npm run typecheck && npm run lint && npm test` before pushing.
   - Post a one-line status in team chat every 2 hours.
5. **docs/DATA_AND_ASSUMPTIONS.md**: a table template (value, file, source, note) pre-filled with the bodies' gravity values.
6. **docs/TASKS.md**: a "first tasks" list for each owner (below).

### First tasks per owner (put in `docs/TASKS.md`)

| Owner | Folder | Do first (target) |
|---|---|---|
| 1 | `src/sim` | Moon landing playable in the flight canvas with keyboard controls, bullseye rings and touchdown classification (about 4 h) |
| 2 | `src/builder` | Real `computeShipStats` with the rocket equation, mass, power, data and cost, plus live slider stats in the hangar UI (about 4 h) |
| 3 | `src/economy` | Payout formula, funding gate, replay rule (reward only if net beats previous best, else 30%), wear model, save/load with tests (about 4 h) |
| 4 | `src/data` | Expand `parts.json` and `bodies.json` first (by hour 2), then contracts, items, research; keep `DATA_AND_ASSUMPTIONS.md` current |
| 5 | `src/ui` | Make all screens navigable and consistently styled (theme, layout, HUD meters); then the hangar layout and the scavenging live feed |
| 6 | `src/state`, `src/report` | Keep the full loop working as modules land; real `generateReport` with plain-language causes and suggestions; tutorial text; deployment checks; pitch assets |

## RULES FOR YOU (THE AI)

- Read `docs/CONCEPT.md` and keep every module's TODO comments aligned with it.
- Make the project **install, typecheck, lint, test and build with zero errors** before you finish.
- Keep stubs honest: they must clearly be stubs (TODO comments, `source: "game"`), never pretend to be final logic.
- No extra dependencies beyond: `vite`, `typescript`, `vitest`, `eslint` (+ TypeScript ESLint), `prettier`.
- Do not add gameplay, art, sound, animations, or styling beyond the placeholder CSS.
- Do not modify the concept file's content when copying it.
- Do not ask me questions mid-way unless something blocks you. Make the sensible choice, and list it in the report.

## ACCEPTANCE CHECKLIST (verify each, then report)

- [ ] `npm install` works from a clean clone
- [ ] `npm run dev` opens the app; the debug bar can jump to every phase
- [ ] "Run mock mission" goes through the whole loop and shows a results screen with a report
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass
- [ ] Every module function in the "Module interfaces" section exists with the exact signature
- [ ] All starter JSON files validate at startup
- [ ] Feature flags exist and are respected by stubs
- [ ] GitHub Actions workflow file is present and valid
- [ ] All docs listed above exist
- [ ] Footer shows a version/commit stamp

## FINAL REPORT FORMAT

When done, reply with:
1. A short summary of what you created.
2. The exact commands to run, test and build.
3. Anything in the repo that already existed and what you did with it.
4. Any additions to `types.ts` or conflicts you found with the concept file.
5. Manual steps the humans must do (for example enabling GitHub Pages, replacing `@owner-N` in CODEOWNERS with real usernames).
6. Anything you were unable to verify.
