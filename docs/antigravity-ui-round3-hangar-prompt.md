# Prompt for Antigravity: hangar round 3 (bigger blueprint, compact parts list, slot highlights)

Attach to the same message: (1) the screenshot of the current hangar, (2) the Figma hangar image (the ship blueprint is the visual target). Paste everything below the line.

---

# NON-NEGOTIABLE RULES (unchanged)

1. **Do not change any functionality code.** Another team member is working on it. This is presentation and interaction-layer work only.
2. **If a functionality change seems needed, STOP and ask me BEFORE editing.** Say which file, what, and why. Keep working on other tasks meanwhile.

**Protected (read only):** `src/types.ts`, `src/sim/**`, `src/builder/**`, `src/economy/**`, `src/report/**`, `src/state/**`, `src/core/**`, `src/config/**`, `src/data/**`, tests outside `src/ui/`, `package.json` dependencies, lockfile, CI.
**Allowed:** `src/ui/**`, `public/**`, UI notes under `docs/`.

- Every value shown must come from the same source as now. Every control must call the same store action or function with the same arguments (drag and drop calls the same add function as `+ ADD`; removal calls the existing remove function).
- Mounting data and layout stay UI-only (the `src/ui/assembly/` files and the UI `localStorage` map). Never add fields to `PartInstance` or the save game.
- Format only files inside `src/ui/`. Work on branch `ui/round3` from the latest `main`. Never push to `main`.
- At the end run `git diff --name-only main...HEAD`. Every path must be in an allowed location.

---

## WHAT IS WRONG IN THE CURRENT HANGAR (from the screenshot)

1. **The ship is tiny.** The drawing fills only about 15% of the canvas and sits in a sea of empty grid.
2. **The "Installed hardware" list eats the space.** It is a tall vertical list, each chip stacked on its own line with the × button below the name, and it shrinks the canvas to a short strip. Names also touch the left edge (check padding and overflow).
3. **The 2D drawing is poor.** It does not look like a spaceship: a small box, a tiny bell, a floating panel. Labels are tiny (about 7px), overlap, and run into each other. It does not match the Figma blueprint.
4. **A part is unmounted** ("UNMOUNTED (1): NO MOUNT SLOT AVAILABLE") even though the design only has four basic parts. A minimal ship must always have a valid place for every category.
5. **Nothing tells the player where a part should go** until they are already dragging.

Fix all five. Work in this order and commit after each.

## 1. CANVAS SIZE AND AUTO-FIT

- The blueprint canvas is the **hero of the screen**. Give it all remaining height in the centre column (`flex: 1; min-height: 0`), and make sure nothing below it can grow past its fixed height (see section 2).
- **Auto-fit:** compute the bounding box of the assembled ship (including labels) and scale and centre it so the ship fills **at least 60% of the canvas height** with about 10% padding, with the ground datum line near the bottom. Re-fit whenever parts change or the panel resizes (ResizeObserver).
- Add **Fit**, **+** and **−** buttons, mouse-wheel zoom, and drag-to-pan. Fit is the default.
- Draw in **real-world metres** from one shared scale so all parts have consistent proportions (for example: bus about 1.2 m wide, tank diameter about 1.2 m with a height that follows its fuel capacity, engine bell about 0.8 m, leg span about 3 m). Use read-only values from the part definition and `paramValues` to size parts. The "total height" dimension line shows the real drawn height in metres.

## 2. COMPACT INSTALLED-HARDWARE RAIL

Replace the vertical list with a **single-row rail** under the canvas:
- **Fixed height of at most 72px**, `display: flex; flex-wrap: nowrap; overflow-x: auto`, with a thin scrollbar.
- Each chip is horizontal: part name (truncated with a tooltip), a thin condition bar, the condition %, and an inline × button, all on one line. At least 12px text, with proper left padding.
- The header of the rail is a compact line: "INSTALLED (N)" and an overall integrity pill. No full-width bar.
- A small **expand** button opens the full list as an **overlay drawer** over the canvas (it must not push or resize the canvas), closable with Escape or a click outside.
- Selecting a chip selects that part on the ship (and highlights it), and hovering a ship part highlights its chip.
- The **"Unmounted" warning** becomes a small badge in the canvas corner that opens a tooltip listing the part and why. It must not take a row of height.

## 3. BETTER 2D BLUEPRINT (match the Figma image)

Redraw the ship so it reads clearly as a spacecraft, in blueprint style:
- **Line art:** 1.5px strokes in off-white (`--text`, about 80% opacity) with dark fills, a faint grid, a ground **datum line** with hatch marks, and a **centre-of-mass marker** (circle with crosshair).
- **Part shapes:** tank as a tall cylinder with thin horizontal hatch lines; engine as a bell with a gimbal ring, with the **bell and plume in orange**; legs as angled struts with joints and foot pads (splayed from the lower body to the ground); dish as an arc with a feed; solar panels as segmented rectangles on short booms; camera and seismometer as small boxes with lens detail (mint and amber accents); RCS as small paired nozzles; bus/avionics as a capsule or box with panel lines. The overall silhouette should resemble the Figma: dish on top, avionics bay, tank body, engine below, legs to the ground.
- **Labels:** at least 12px mono, with thin leader lines. Place labels on the left and right alternately, with **collision avoidance** (minimum spacing, no overlaps, no label drawn over the ship). Use short names.
- **Dimension lines** for total height and leg pad span.
- Smooth, subtle transitions when parts are added or removed (about 150ms, respecting reduced motion).

## 4. MOUNTING SLOTS: ALWAYS HAVE A PLACE, ALWAYS SHOW IT

**Fix the "no mount slot available" case.** Redefine the UI mount tables so a minimal ship works. Every host part (bus, tank) exposes these named slots: `top`, `bottom`, `upper-left`, `upper-right`, `lower-left`, `lower-right`. Rules:
- Legs occupy the lower pair as a mirrored unit. Solar panels, RCS and instruments prefer the upper pair, then the lower pair. The engine uses `bottom`, and engine clusters can share it (up to 4). Dishes and antennas use `top`.
- A bus alone must accept an engine, legs, solar panels, antennas and instruments.
- If every slot is genuinely full, keep the existing "Unmounted" tray behaviour, but this should now be rare.
- Each part still has only 1 or 2 mounting points of its own (its plug points). Host parts have the named slots above.

**Highlight where each item goes (new):**
- **On hover, focus or selection of a part card** in the library (not only while dragging), show on the ship: pulsing **orange rings** on every free compatible slot, each with a small label ("ENGINE MOUNT", "LEG MOUNT", "POWER MOUNT", and so on), and a **ghost preview** (translucent orange outline at about 40% opacity) of the part at its best slot, with an "Attach here" callout. Incompatible slots are dimmed, and occupied slots show a small filled dot.
- **While dragging:** the nearest valid slot gets a stronger highlight and a snap line to the part. Hovering an invalid slot shows the reason ("Engines attach to the bottom of a tank or bus").
- **Empty assembly:** show a faint dashed rocket silhouette with labelled zones (Payload/Comms on top, Bus or Tank in the middle, Engine at the bottom, Legs on the lower sides, Power on the upper sides). Hovering a category card lights up its zone. Add a "Show guide" toggle (on by default) that hides it.
- Highlights must work with the keyboard (focus on a card shows them, Enter mounts at the best slot).
- All slot labels at least 12px.

## 5. VERIFY

```bash
npm run typecheck && npm run lint && npm test && npm run build
git diff --name-only main...HEAD
```

Then check at **1280×720 and 1920×1080**:
- The canvas takes at least 55% of the centre column height, and the ship fills at least 60% of the canvas height when it has 4 or more parts.
- The rail is one row, at most 72px, and the canvas does not change size when parts are added.
- A design with only a bus, an engine, legs and a solar panel has **no unmounted parts**.
- Hovering each category card highlights valid slots and shows the ghost preview.
- `+ ADD`, drag and drop and the starter preset still give identical `ShipStats` for the same parts, and the mock mission shows identical numbers.

## FINAL REPORT

Reply with: the `git diff --name-only` output with confirmation that no protected file was touched; the final mount slot table and where it lives; any functionality concern you found and did not act on; and visual differences from the Figma image you could not fix.
