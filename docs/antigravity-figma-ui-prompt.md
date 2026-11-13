# Prompt for Antigravity: build the Launchsmith UI from the Figma design

**Before you paste this:**
1. Merge the `Game&engine` integration branch into `main` and pull, so the UI sits on the latest code.
2. Connect the Figma MCP in Antigravity and sign in with the account that can open the file.
3. Know the risk: the Figma account used here is on a free (Starter) plan with a **View** seat. Figma has limited MCP read calls on such seats, so Antigravity may get rate-limited. The prompt below includes a written spec of every frame so it can still proceed. If it hits a limit, use a Full/Dev seat or duplicate the file into an account that has one.

Paste everything below the line into Antigravity.

---

## TASK

You are the UI integrator for a hackathon game (NASA Space Apps 2026, "Space Mission Design Game", working title **Launchsmith**). Our designer made the UI in Figma. **Implement that design in our existing codebase, wired to the real game logic, without breaking anything.** Work only in the UI layer.

## FIGMA SOURCE

- File key: `0Rwp4kwZkBtHlkzKLB0hEv` (page "Page 2", node `21:702`)
- Link to the selected frame: https://www.figma.com/design/0Rwp4kwZkBtHlkzKLB0hEv/Untitled?node-id=25-4268
- Frames I found (all 1280 wide, desktop):

| Node ID | Size | What it is |
|---|---|---|
| `21:1337` | 1280×872 | **Step 00: Mission Select** (target bodies list, orbital map, body specs, contract card) |
| `21:704` | 1280×1024 | **Step 01: Hangar** (parts library, blueprint canvas, tuning sliders, live telemetry, advisories) |
| `25:4268` | 1280×1040 | **Step 04: Scavenge** (action deck, radar map, surface meters) |

The top navigation shows six steps: 00 Mission Select, 01 Hangar, 02 Pre-flight, 03 Flight, 04 Scavenge, 05 Results. **I only found frames for 00, 01 and 04.** Before building, list all top-level frames on page `21:702` yourself (frame names are often "Html → Body"). If frames for pre-flight, flight or results exist, use them. If not, build those screens in the same visual language (see "Missing screens").

## STEP 0: UNDERSTAND THE PROJECT FIRST

Read, in this order:
1. `docs/CONCEPT.md` (the full game design).
2. `src/types.ts` (the shared contract, **frozen**), `docs/CONTRACTS.md`, `docs/CONVENTIONS.md`, `docs/WORKING_AGREEMENT.md`.
3. `src/state/` (store and phase flow), `src/ui/` (router, screens, components, styles), `src/config/` (constants, feature flags).
4. `src/data/` (bodies, parts, contracts, items, research, tutorial text) and `src/mocks/`.
5. Skim `src/builder`, `src/sim`, `src/economy`, `src/report` so you know what each screen can show.

Run `npm install && npm run dev` and click through every phase with the debug bar. Write a short summary of what each screen currently has available. Do this **before** opening Figma.

## STEP 1: PULL THE DESIGN

1. Load the Figma `figma-design-to-code` skill/guidance first (the Figma MCP requires it before design-context calls). Start a session with `create_session` for file key `0Rwp4kwZkBtHlkzKLB0hEv`.
2. For each frame above: get the metadata, the design context (with a screenshot), and download its assets. Download every icon and image into the repo. **Never leave temporary Figma asset URLs in code.**
3. The file has **no Figma variables** (variable definitions came back empty), so read the colours, fonts, sizes, spacing and radii from the design context and turn them into tokens.
4. If a call fails or you are rate-limited, **stop and tell me**. Use the written spec below as the fallback, and do not invent exact colours or fonts you could not read.

**Our project has no UI framework** (vanilla TypeScript DOM + plain CSS + Canvas 2D). Figma's generated code is usually React/Tailwind. Use it only as a visual and structural reference, rewrite it in our stack, and add no dependencies.

## STEP 2: WHAT THE DESIGN CONTAINS (written spec from my review)

### Visual language
Dark, technical "mission control" look: near-black backgrounds, hairline 1px borders (no shadows or glows), uppercase monospace micro-labels with wide letter-spacing, a clean sans for titles and values. Two colours are named in the layers: **Signal Orange `#FF5A1F`** (active step, primary buttons, selected items, warnings) and **Nominal Green `#1FA971`** (OK status, positive values, funds). Amber is used for warnings and "lost" data. Read exact values for everything else from the design context.

### Shared app shell (appears on every screen)
- **Header:** `LAUNCHSMITH` wordmark with a version tag; six-step progress tabs (completed steps show a check, the active step is a filled orange block); difficulty segmented control `EASY / NORMAL / HARD / SANDBOX`; funds readout (green, e.g. `$142.8M`); icon buttons (sound, pause, settings); avatar.
- **Footer:** secondary button(s) on the left, a centre status pill (craft name and status), and one orange primary call-to-action on the right.
- **The three frames use slightly different shells** (version text, tab styling). Treat the **Scavenge frame `25:4268` (v0.9.4)** as the canonical shell, build it once as a shared component, and take the version from `package.json`.

### Screen 00: Mission Select (`21:1337`)
- Left: "Telemetry docks" mini-nav.
- Target bodies list: Moon (RDY), Mars (RDY), Europa (locked), Titan (locked). Each card shows tier, description, distance, Δv-to-orbit, and for locked bodies a requirement line.
- Centre: orbital transfer projection (schematic SVG map) with a header, readouts, and a Δv filter (`ALL / INNER / GAS GIANTS`).
- Right: body physical specs (surface gravity, atmospheric density, solar flux, temperature range, rotation, transit window, escape velocity, landing site elevation), operational constraint notices (parachutes unusable, dust, thermal shadow), and a "recommended craft baseline" (max wet mass, min TWR, min Δv margin).
- Bottom centre: available contract card (title, description, budget cap, bonus, accuracy, difficulty, required payload) with a "Selected" tag.
- Primary action: accept the contract and open the hangar.

### Screen 01: Hangar (`21:704`)
- Left: component hierarchy (Structure & Chassis, Propulsion Matrix, Guidance & RCS, Payload & Cargo, Staging Sequence).
- Parts library: search box, category filter pills (ENGINES, TANKS, LEGS, POWER, COMMS, …), part cards with icon, name, mass, cost, key stat, and an `+ ADD` button. Locked parts are greyed with a reason line ("Locked: no atmosphere on Moon", "Locked: insufficient solar flux").
- Centre: contract strip (contract name, budget cap, funds used, required-instrument chips), a **2D / ISO / WIRE** view switcher, a blueprint-style ship drawing with dimension lines and labels, a status pill (symmetry, attach, rigidity), and an "Installed hardware" rack with per-part condition bars and overall integrity.
- Right: **part tuning matrix** (sliders with min / nominal / max for the selected part: thrust scale, specific impulse, gimbal range, fuel ratio), **live flight telemetry** (reliability, total wet mass with dry and fuel split, Δv versus required, TWR with status and minimum, power net, science bandwidth versus required, budget allocation bar), and **diagnostics and advisories** (amber warning and info cards).
- Footer: `Starter Moon Preset`, `Save Design`, `Reset Assembly`, craft/mass/checksum pill, and `CONTINUE TO PRE-FLIGHT`.

### Screen 04: Scavenge (`25:4268`)
- Left "Action Deck": three action buttons: **Deploy instrument** (energy cost and cycle time), **Send data** (energy cost and uplink MB), **Collect sample** (shown disabled with a fault reason, "robotic arm actuator seal frozen"); site radius and drift readout at the bottom.
- Centre: orthographic radar with range rings (25 m, 75 m, 100 m), the landed craft in the centre, and four markers: instrument spot (selected, with a callout), sample site, intact tank (a resource find), antenna spot. Coordinates in a top banner, scale and range at the bottom.
- Right "Surface meters": battery (Wh and % with solar generation), data sent versus generated (two-tone bar: green sent, amber lost) with MB lost, salvage value (money) with surveyed targets and a bonus, plus surface temperature and comm window.
- Footer: `Return to Orbit`, craft/touchdown status pill, `Finish and see results`.

## STEP 3: FRAME-TO-SCREEN MAPPING

| Design step | Our phase | Source |
|---|---|---|
| 00 Mission Select | `contracts` | Frame `21:1337` |
| 01 Hangar | `hangar` | Frame `21:704` |
| 02 Pre-flight | `preflight` | **No frame found.** Build from the shell (see below) |
| 03 Flight | `flight` | **No frame found.** Build from the shell (see below) |
| 04 Scavenge | `scavenge` | Frame `25:4268` |
| 05 Results | `results` | **No frame found.** Build from the shell (see below) |
| (none) | `home`, `research`, `team` | No design. Keep simple, restyle with the tokens and shell |

## STEP 4: DATA BINDINGS AND GAPS

**Rule: show real data only. Never hard-code the numbers or text from the mockup.** Where the game has no data for something in the design, show an em dash or hide the element, add a `// TODO(owner-N):` comment, and list it in your report. **Do not change `src/types.ts`, `src/data/*.json` or any logic folder.**

| Design element | Bind to | Status |
|---|---|---|
| Funds readout | `save.fundsM` | OK |
| Difficulty switcher | `save.difficulty` (`'easy' | 'normal' | 'hard' | 'sandbox'`) | OK. Lock it once a mission starts (changing it mid-mission would break fairness) |
| Craft name | `design.name` | OK |
| Checksum text | Short hash of the design JSON (computed in the UI) | OK (real value) |
| Parts list, mass, cost, key stat | `getParts()`, `PartDef` | OK |
| Part filters | Map to `PartCategory`: Propulsion = engine+tank, Guidance & RCS = rcs+computer, Structure = hull+leg, Payload = instrument+comms+power | Map as listed |
| Locked part reason | `getLockReason(part, body)` from `src/data/tutorial.ts` | OK |
| Tuning sliders | `PartDef.params` (`ParamSpec`: min, max, step, default, unit, `explain`) and `PartInstance.paramValues` | OK. "Nominal" marker = `default` |
| Total mass, dry, fuel, Δv, TWR, power net, bandwidth, reliability, cost | `computeShipStats(design, catalog, body)` | OK |
| "REQ" values (required Δv, required bandwidth) | Required bandwidth = `stats.dataGenKbps` versus `stats.downlinkKbps`. **Required Δv is not in `Contract`** | Gap: show `—` and TODO(owner-4) |
| Budget allocation bar | `stats.costM` versus `contract.budgetCapM` (apply `getDifficultySettings(...).budgetModifier`; sandbox = unlimited) | OK |
| Advisories | `stats.warnings`, `stats.violations`, and `getActiveHints(ctx)` (only when `helpLevel === 'hints'`) | OK |
| "Buffer overflows after 180 s" figure | Needs a helper in the builder | Gap: show the generic warning without the number, TODO(owner-2) |
| Installed hardware rack and integrity | `PartInstance.condition` and `maxCondition`; overall = average | OK |
| Repair action | `repairPart` in `src/economy/wear.ts` | OK (add a small repair button if the design has none) |
| Starter Moon Preset / Save Design / Reset Assembly | Starter design in mocks or data, `writeSave`, reset to default design | OK |
| Blueprint ship drawing | Use the design's SVG as the template and highlight/label the parts that are installed | Static is acceptable. Dynamic assembly is a stretch |
| 2D / ISO / WIRE switcher | 2D works. ISO and WIRE render as disabled with a "soon" tooltip | Stretch |
| Symmetry / attach / rigidity pill; "Staging Sequence" nav item; CAD kernel/FPS text | No backing feature | Hide, or show as disabled decoration. Do not fake values |
| Body list | `getBodies()` | **Mismatch:** design shows Moon, Mars, Europa, Titan, but our data has Moon, Mars, Titan, Venus and an asteroid. Render from data, do not hard-code Europa. Report it to the data owner |
| Body specs (distance, Δv to orbit, escape velocity, temperature range, rotation, transit window, elevation, comm delay) | `Body` only has gravity, atmosphere, `baseLifetimeS`, `solarFlux`, `note` | Gap: show gravity, atmosphere and solar flux from data. Others show `—`, TODO(owner-4) (optional fields) |
| Operational constraint notices | `body.note`, atmosphere (`null` = no atmosphere), `solarFlux` | Derive from data. Do not invent text |
| Recommended craft baseline | Not in `Contract` | Gap: `—`, TODO(owner-4) |
| Contract card (title, objective, budget cap, reward, required instruments) | `Contract` | OK. "Accuracy ± 25 m" = ring radius for the difficulty (read from constants if available, else `—`) |
| Locked body/contract requirement text | `contract.fundingGateM`, `unlocksContractId`, `nextContractUnlocked(save, contract)` | OK. Do not use the mockup's invented requirements |
| Scavenge battery / data / salvage meters | `ScavengeResult` (`dataGeneratedMB`, `dataSentMB`, `endedBy`, `itemsFound`) and `stats.batteryWh` | Partly. Battery over time and salvage money need playback values; derive from events, else `—` |
| Scavenge map markers | Items in `ScavengeResult.itemsFound` | Gap: items have no position. Place markers deterministically from the item id (seeded), UI-only. TODO(owner-3) for real positions |
| Scavenge "Intact tank (CH4)" find | Not in `items.json` | Gap: only show items that exist in data |
| Scavenge countdown | `timeAvailableS` and `timeUsedS` | **The design has no countdown timer, but the concept requires one.** Add a prominent one in the matching style |
| Footer craft pill / touchdown status | `FlightResult.outcome`, `stats`, body name | OK |

## STEP 5: SCAVENGE SCREEN BEHAVIOUR (decision needed, do this for now)

The concept says scavenging runs **automatically on a timer**, but the design shows player actions (Deploy instrument, Send data, Collect sample). Until the team decides:
- Call `simulateScavenge` once, then **play the result back** against the countdown: events appear in a live feed and the meters advance with `tS`.
- Render the three action buttons as in the design, with states derived from the playback (for example "Send data" is enabled while unsent data exists). Their handlers are `// TODO(owner-3)` stubs that only log an event, and must not change results.
- "Collect sample" shows disabled with a reason only if a part-failure event exists in the result.
- "Return to Orbit" ends the phase early for now (same as Finish, with a TODO).
- Do not add gameplay logic. Report this as an open design decision.

## STEP 6: MISSING SCREENS (pre-flight, flight, results, plus home/research/team)

Build them with the shared shell and tokens:
- **Pre-flight (Go/No-Go):** a checklist of stats against limits (mass, Δv, TWR, power, data, cost, reliability with failure risk %), a summary of warnings and violations, and a Launch button disabled when `stats.valid` is false.
- **Flight:** a Canvas 2D view with an HUD overlay (altitude, vertical and horizontal speed, fuel, throttle, tilt, heat) and the bullseye target with rings. The UI only reads the sim state and sends controls. Keep the keyboard controls working. Do not move physics into the UI.
- **Results:** score breakdown, payout lines, streak multipliers, funding gate progress, and the post-mission report (headline, causes, suggestions, timeline, NASA reference). Buttons: replay, next contract, research.
- **Home, research, team:** simple screens in the same style. Hide `team` when the `teamMode` flag is off.

## STEP 7: DESIGN PROBLEMS TO FIX WHILE IMPLEMENTING

The mockups have clipped and overlapping text. Implement the **intent**, not the overflow, using flexible layouts that wrap or truncate with a tooltip:
- Hangar contract strip: contract name, budget cap and funds text overlap and are cut off.
- Mission Select: the contract card text is clipped (budget cap, accuracy, difficulty), the left dock item "Vessel Assembly" is cut off, and the footer stacks **two sets of primary buttons** ("Accept contract & open hangar" and "Commit mission profile"). Keep **one** primary action per screen.
- Scavenge: the antenna spot and intact tank labels overlap, and two meter captions run together.
- The shell differs between frames (see above). Use one shared shell.
- Fonts look inconsistent across frames in the previews. Check the real font names in the design context, use one pair everywhere, and tell me which you chose.

## STEP 8: IMPLEMENTATION RULES

- **Branch:** `git switch -c ui/figma-integration` from the latest `main`. Never push to `main`.
- **Tokens first:** put colours, fonts, sizes, spacing and borders in `src/ui/styles/tokens.css` as CSS variables and use only those. Self-host or load the fonts.
- **Shared components** in `src/ui/components/`: app shell (header, step tabs, footer), button, segmented control, meter/progress bar (single and two-tone), stat card, panel header, tag/chip, tooltip, part card, slider row, advisory card, modal. Screens must reuse them.
- **Screens** in `src/ui/screens/` keep their export shape `renderXxx(root: HTMLElement, state: GameState): void` so the router keeps working. You may extend `src/ui/router.ts` to render the shell around screens and to make step tabs clickable only for steps the player has reached.
- Respect difficulty (`getDifficultySettings(...).helpLevel`: hints / tooltips / minimal) and the feature flags in `src/config/feature-flags.ts`.
- Keep the `data-tutorial="<id>"` attributes (`contract-brief`, `parts-menu`, `throttle-slider`, `skip-transit-btn`) and document any new ones in `docs/CONVENTIONS.md`.
- Layout is **desktop first** (design is 1280 wide, minimum supported about 1024). Below that, let panels stack or scroll rather than break. Keep text readable and contrast accessible, keep controls keyboard-reachable.
- **Assets:** save icons as SVG in `src/ui/assets/`, check licenses for anything beyond the design's own assets, and add no dependencies.
- Keep the debug bar (dev only) and the version/commit footer stamp.

## STEP 9: VERIFY

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

All must pass. Then run the app and play the whole loop (contract, build, preflight, flight, scavenge, results). If you can take screenshots, compare each implemented screen against its Figma screenshot at 1280px width, and fix visible differences. Check that no screen shows mockup text such as "Apollo-Redux" or "$142.8M" where real data should appear, and that every Figma asset file exists locally and renders at the right size.

## STEP 10: FINISH

1. Commit in logical steps (tokens, shell and components, then one commit per screen).
2. Push `ui/figma-integration` only. I will review and merge.
3. If something blocks you, stop and list it instead of guessing.

## FINAL REPORT

Reply with:
1. All top-level frames you found on page `21:702` and which screens they map to.
2. What was implemented per screen and what was left out.
3. The gap table: every design element with no backing data, and the `TODO(owner-N)` notes (especially the owner-4 data fields: required Δv, body specs, recommended baseline, Europa versus our bodies).
4. How you handled the scavenge screen (decision pending).
5. Tokens, fonts and assets added, with licenses.
6. Any file changed outside `src/ui/`, `public/` and docs (there should be none).
7. Test, lint, typecheck and build results, and visual differences you could not fix.
