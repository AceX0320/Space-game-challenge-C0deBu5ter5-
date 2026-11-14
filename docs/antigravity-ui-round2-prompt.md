# Prompt for Antigravity: UI round 2 (hangar assembly, budget panel, contract data, flight fixes, bigger text)

**Before you paste this:**
1. Attach the **Figma hangar image** (the blueprint of the spaceship) to the same message. It is the visual target for the ship drawing. The frame is `21:704` in the Figma file, and the blueprint layer is the large centre canvas.
2. Attach the two screenshots of the current hangar and contract screens so the AI sees what is wrong.
3. Ask your teammate which files they are editing, so you avoid conflicts (probably `src/ui/screens/flight.ts` and `hangar.ts`).

Paste everything below the line into Antigravity.

---

# NON-NEGOTIABLE RULES (same as the last round)

**1. Do not change any functionality code. Another team member is working on it.** This is a presentation and interaction-layer job.

**2. If a functionality change is needed, STOP and ask me BEFORE editing.** Say which file, what change, and why. Do not edit it. Keep working on other tasks while you wait.

**Protected (read only):** `src/types.ts`, `src/sim/**`, `src/builder/**`, `src/economy/**`, `src/report/**`, `src/state/**`, `src/core/**`, `src/config/**`, `src/data/**` (including JSON and tutorial text), tests outside `src/ui/`, `package.json` dependencies, lockfile, CI.

**Allowed:** `src/ui/**`, `public/**`, `index.html` (fonts and title only), and UI notes under `docs/`.

**What this means here:**
- Every value shown must come from the same source as now (store, `computeShipStats`, `computePayout`, and so on). No new game logic, no recomputing results.
- Every control must call the **same store action or module function with the same arguments** as today. **Drag and drop must call exactly the function the existing `+ ADD` button calls.** Removing a part must call the existing remove function.
- Do not block or allow actions differently than now (for example, do not stop the player adding a part over budget).
- Run the formatter only on files inside `src/ui/`.
- Branch from the latest `main`: `git switch -c ui/round2`. Never push to `main`.
- At the end run `git diff --name-only main...HEAD`. Every path must be in an allowed location.

## STOP-AND-ASK ITEMS (do not edit these without my answer)

1. **Contract screen data** (distance, transit time, Δv, escape velocity, temperature range): the data does not exist in `Body` or `Contract`. See "Contract selection" below. Ask me with the exact diff you propose.
2. **Landing collision** (the ship passes through the landing zone): first diagnose whether it is only a drawing offset (fix it in the UI) or a physics problem (flag me). See "Flight".
3. Anything else that needs a change in a protected file.

## WORK ORDER (commit after each, in this order, so something good ships even if time runs out)

1. Layout bugs, font sizes, flight fuel bar, landing diagnosis.
2. Budget panel and over-budget popup.
3. Contract selection data (after my answer on the data fields).
4. Hangar redesign and blueprint ship drawing.
5. Drag-and-drop assembly with mounting points.

---

## 1. LAYOUT BUGS TO FIX FIRST

- The **dev bar overlaps the footer buttons** on the hangar and contract screens (Starter Moon Preset, Save Design, Reset Assembly, Home are cut off). Make the app a grid with a dedicated row for the dev bar below the footer (development builds only), so nothing is covered.
- The hangar's left column wastes space: the parts library cards are pushed to the bottom with a large empty gap, and the component hierarchy list takes room without helping. Fix this in the hangar redesign below.
- No clipped text anywhere. Panels scroll inside themselves. Test at 1280×720, 1440×900 and 1920×1080.

## 2. BIGGER TEXT (overrides the small sizes in the Figma tokens)

The Figma sizes (10–11px labels) are too small to read. Increase the whole type scale, using a single token set so it can be tuned in one place:

| Use | New size |
|---|---|
| Minimum size for any text | 12px (never smaller) |
| Micro-labels (uppercase mono) | 12–13px |
| Body and descriptions | 15px |
| Table rows, list items, button text | 15–16px |
| Values in cards | 18–20px |
| Hero numbers (budget, battery, score) | 32–36px |
| Screen titles | 20–22px |

**Results screen:** body and table rows 16–17px, headline 28–32px, score numbers 24px+, generous row spacing (at least 44px rows), analysis cards 15–16px. Keep the same colours and tokens. Use `rem` units from a root size so the whole UI can be scaled with one value.

Larger text must not cause clipping. Let panels scroll and wrap, and truncate long names with a tooltip.

## 3. BUDGET PANEL AND OVER-BUDGET POPUP (money must be much more visible)

Redesign the money display in the hangar. It only reads existing values (`stats.costM`, the contract budget cap, the agency funds from the save, the difficulty settings).

**Budget panel** (top of the right column, large):
- Three big numbers: **USED**, **CAP**, **REMAINING**. When over the cap, REMAINING becomes **OVER BY $X** in the danger colour.
- One wide bar with a visible **cap marker**. Colours: mint below 80%, amber from 80 to 100%, orange/red above 100%.
- A **preview**: when the player drags or hovers a part, show a ghost segment for its cost and the projected total ("+ $8.0M → $38.5M"). If it would pass the cap, the ghost is red with "Over cap by $X".
- Agency funds shown as a second line with the funds label from the header.
- In Sandbox mode (unlimited funds) show "UNLIMITED" and never show warnings.

**Funds in the header:** make the chip larger and clearer, and animate a short count when the value changes (respect `prefers-reduced-motion`).

**Popup** ("BUDGET CAP EXCEEDED"), shown once each time the build crosses above the cap (and re-armed when it drops back below; never on every slider tick):
- Shows USED, CAP and OVER BY, plus the three most expensive installed parts (from the part catalog, read only).
- Buttons: **Remove last added part** (calls the existing remove function), **Review parts** (closes and focuses the installed hardware strip), **Keep anyway** (closes). Keeping it open for the player's choice must not change behaviour, and the existing validation still decides whether Continue is enabled.
- After closing, keep a persistent red banner under the budget panel while over the cap.
- Also show a gentle toast at about 90% of the cap.
- Accessible: focus trap, Escape to close, `role="alertdialog"`.

## 4. CONTRACT SELECTION: SHOW DISTANCE AND DATA

The design shows, per destination, distance and Δv to orbit, and a specs panel with surface gravity, atmosphere, solar flux, temperature range, rotation, transit window, escape velocity and landing elevation. Today the app shows "—" for distance, transit, Δv, escape velocity and temperature.

**UI work (allowed now):** destination rows show `DIST` and `Δv ORBIT` like the design. The map panel shows target, distance, transit and Δv readouts. The specs panel shows all rows. Use the existing values where they exist, and `—` where not.

**Data (STOP-AND-ASK):** the fields do not exist. Propose this diff to me and wait:
- In `src/types.ts`, add **optional** fields to `Body`: `distanceFromEarthKm`, `transitTimeDays`, `deltaVToOrbitMs`, `escapeVelocityMs`, `surfaceTempMinC`, `surfaceTempMaxC`, `rotationPeriodHours`.
- In `src/types.ts`, add optional fields to `Contract`: `requiredDeltaVms` and `recommendedBaseline: { maxWetMassKg; minTwr; minDvMarginMs }`.
- In `src/data/bodies.json` and `contracts.json`, fill the values. Starting values from the designer's mockup (Moon: 384,400 km, 1,730 m/s Δv to orbit, 2,380 m/s escape velocity, about 72–84 h transit, −130/+120 °C, 27.32 days rotation; Mars: 225.0M km, 3,800 m/s Δv to orbit). **The data owner must verify every value against the NASA Planetary Fact Sheet, and mark each one `nasa` or `game`.** Venus, Titan and the asteroid need values from the data owner.
- Format large numbers readably ("225.0M km", "1,730 m/s").

Also: do not show absurd placeholder values such as "$999999.0M". Display "Locked" or "TBD" for clearly placeholder values and flag the data problem to me.

## 5. FLIGHT SCREEN

**Fuel bar (UI only):** add a horizontal fuel gauge to the telemetry HUD, driven by the same fuel value now shown as "FUEL: 2902 kg (96.7%)". Show the label, kg and %, a bar with a low-fuel marker, and colours: mint above 30%, amber 10–30%, orange/red below 10%. A subtle pulse below 10% (respect reduced motion). Keep the numeric readout.

**Landing: the ship passes through the landing zone and stops below it** when the legs touch the lower ground. Diagnose before touching anything:
1. Log the sim's touchdown position (`yM`) and how the drawing maps it to pixels.
2. Check whether the **drawn ground line or landing bar** is at a different pixel height than the sim's `y = 0`, and whether the **ship sprite's feet** are offset from the sim's reference point (centre versus the bottom of the legs).
3. **If it is only drawing (coordinate mapping, sprite offset, ground and bar drawn in the wrong layer or position):** fix it in `src/ui/`. The ship must visually stop with its leg pads **on the landing zone surface**, and the landing bar must be drawn on the ground line, not below it. Do not change the sim.
4. **If the sim itself lets the ship go below the ground or ignores leg length at touchdown:** **STOP and tell me** exactly which file and function, with your finding. Do not edit it.

Also restyle the landing target with orange and mint rings (no blue or teal) and make sure the touchdown marker is clearly visible.

## 6. HANGAR REDESIGN

**Layout (three columns, all panels scroll internally):**
- **Left: parts library.** Search box, category tabs (Engines, Tanks, Structure, Legs, Power, Comms/Science), then part cards. Remove the separate "component hierarchy" block (the category tabs replace it). Each card: a small drawing of the part, name, mass, cost, key stat, a drag handle, and a `+ ADD` button. Locked parts are greyed out with their lock reason. The list fills the column from the top.
- **Centre: blueprint canvas** (large, fills the height) with a toolbar (2D active, ISO and WIRE disabled with a "soon" tooltip), a grid, and an **installed hardware strip** underneath: a horizontal row of compact chips (part name, condition bar, remove button), replacing the long vertical list.
- **Right:** budget panel (section 3), part tuning sliders for the selected part, live telemetry cards, diagnostics and advisories.
- Footer: Starter Moon Preset, Save Design, Reset Assembly, craft pill, Continue to Pre-flight (all with the same behaviour as now).

**Ship drawing (match the attached Figma image):** a **blueprint** look:
- Thin (1–1.5px) off-white line art on the dark canvas with a faint grid, no fills except subtle dark ones.
- The engine and its plume in **orange**, instruments in **mint** and **amber**, labels in mono with thin **leader lines**.
- Dimension lines (for example total height), a **datum line** at the ground ("Z +0.000 m surface interface"), a **centre-of-mass marker** (circle with crosshair), and small callout labels like the Figma (avionics bay, high-gain dish, camera, seismometer, propellant tank, engine, gimbal, leg pad span).
- Every part has its **own recognisable drawing** (engine bell, tank, legs, dish, camera, solar panel, battery, RCS, computer/bus). Draw them as SVG, and size them using the part's own values (for example thrust scale scales the engine bell) read from `paramValues`. The current empty wireframe must be gone.
- Download any Figma assets into `src/ui/assets/`. Read the blueprint layer from frame `21:704` with the Figma MCP, and reuse its shapes where useful.

## 7. DRAG-AND-DROP ASSEMBLY WITH MOUNTING POINTS

Players drag parts from the library onto the ship. The part appears on the ship immediately.

**This must be UI-only.** The game data has no part positions, so the layout is **derived** from the existing design (`design.parts`) and a **UI-only** map of `instanceId → mounting point`, kept in a UI module and in `localStorage` under its own key (for example `launchsmith.ui.mounts`). Never add fields to `PartInstance` or the save game.

**Mounting points:**
- Every part defines its **own mounting points in its own local coordinates**: **1 or 2 per part**. Keep these definitions in a UI file such as `src/ui/assembly/mount-points.ts` (a table by part id or category). Each point has: id, position (x, y) relative to the part, facing (top, bottom, left, right), and which categories it accepts.
- Examples: engine = 1 point (top); tank = 2 points (top and bottom, so tanks and engines stack); structure/bus = 2 points (top and bottom); legs = 1 point (the hinge, placed as a mirrored pair on the sides of the lowest tank or bus); antenna/dish, camera, seismometer = 1 point each; solar panel = 1 point; RCS block = 1 point; battery and flight computer = 1 point (mounted inside or on the bus).
- Structural parts (bus, tank) additionally expose a **side ring** that accepts radial parts (legs, solar, RCS, instruments), shown as mirrored left/right positions. Describe in your report how you handled this relative to the 1–2 point limit.
- A connection joins a mounting point on the dragged part with a **free compatible point** on a part already placed (top connects to bottom, left to right). Parts can only occupy a free point (engine clusters may share the bottom point and spread horizontally, up to 4).

**Interaction:**
- Use **pointer events** (mouse and touch), not the browser's HTML5 drag API. Show a drag ghost of the part.
- While dragging, **highlight the valid mounting points** (orange pulse) and dim invalid ones. Show the budget **preview** (section 3) at the same time.
- Near a valid point the part **snaps**. Dropping on it calls the existing add function (the one `+ ADD` uses) and records the mounting point in the UI map. Dropping on an invalid spot or outside the canvas cancels (no add) and shows a short reason ("Engines attach below a tank or the bus").
- Click a placed part to select it (its tuning sliders open on the right). A remove button, or dragging it off the ship, calls the existing remove function.
- **Keyboard alternative:** select a part card and press Enter to auto-mount at the first free valid point.
- **`+ ADD` and the starter preset** (which add parts without dragging) must also produce a correct drawing: auto-assign each part to the first free compatible mounting point, using the same rules.
- **Parts that fit nowhere** (for example a second bus): do not block them (behaviour must not change). Draw them in an "Unmounted" tray beside the ship with a warning badge, and add a UI advisory "Part not mounted".
- If a design is loaded and the UI map is missing or stale, rebuild the layout automatically from `design.parts`.

## 8. VERIFY

```bash
npm run typecheck && npm run lint && npm test && npm run build
git diff --name-only main...HEAD
```

Then play the full loop and check:
- The mock mission produces **identical numbers** to before this round.
- Adding parts with `+ ADD`, with drag and drop, and with the starter preset all give the same `ShipStats` as before for the same parts.
- The over-budget popup appears once on crossing the cap, and the Continue button follows the existing validation.
- The ship stops on the landing zone with its leg pads touching it (or you flagged the sim).
- Text is readable at 1280×720 with nothing clipped.

## FINAL REPORT

Reply with:
1. The `git diff --name-only` output, and confirmation that no protected file was touched.
2. The diagnosis of the landing problem (drawing or sim), with the evidence.
3. The exact diff you proposed for contract data fields, and whether I approved it.
4. How you handled structural side rings versus the 1–2 mounting point limit, and where the mount definitions live.
5. Any functionality concern you found and did not act on (file and reason).
6. Anything that depends on missing data, and visual differences from Figma you could not fix.
