# Prompt for Antigravity: restyle the whole UI to match the Figma design (presentation only)

**Before you paste this:**
1. Another teammate is working on the game logic at the same time. Ask them to push their work and tell you which `src/ui/` files they are touching (probably the flight and hangar screens).
2. Make sure the Figma MCP is connected in Antigravity. If it gets rate-limited (the account is on a View seat), the prompt contains the verified design tokens so the work can still continue.

Paste everything below the line into Antigravity.

---

# NON-NEGOTIABLE RULES (read these first)

**1. Do not change any functionality code. Another team member is working on it.**
This is a **presentation-only** job: markup, CSS, layout, typography, colour, icons, spacing, states, motion, and UX flow. Behaviour must be identical before and after.

**2. If you believe a functionality change is needed, STOP and flag me BEFORE editing.**
Ask me in chat immediately, say which file and why, and wait for my answer. Do not edit that file. Keep working on other UI tasks while you wait.

**Protected (read only, never edit):**
- `src/types.ts`
- `src/sim/**`, `src/builder/**`, `src/economy/**`, `src/report/**`
- `src/state/**`, `src/core/**`, `src/config/**`, `src/data/**` (including all JSON and the tutorial text)
- All test files outside `src/ui/`
- `package.json` dependencies and scripts, lockfile, CI workflows

**Allowed to edit:** `src/ui/**`, `public/**` (fonts, icons, images), `index.html` (only the font links and page title), and docs under `docs/` for UI notes.

**What "no functional change" means in practice:**
- Every value shown on screen must still come from the **same source** it comes from now (store, `computeShipStats`, `computePayout`, and so on). Do not recompute, reformat the underlying data, or add new logic. Display formatting (units, decimals, truncation) is fine.
- Every button and control must still call the **same store action or module function with the same arguments**. You may move where the handler is attached in the markup, never what it does.
- Do not change phase flow, routing rules, save data, or the order of calls.
- The flight canvas: restyle drawing (colours, fonts, HUD) only. Do not touch input handling, the sim step loop, timing, or physics. If drawing code is tangled with that logic, flag me first.
- Run Prettier or the formatter **only on files inside `src/ui/`**. Never reformat the whole repo (it would cause merge conflicts with the other member).
- Branch from the latest `main` and rebase often: `git switch -c ui/restyle`. Never push to `main`.

**Final check you must run and show me:**
```bash
git diff --name-only main...HEAD
```
Every path in that list must be in an allowed location. If anything else appears, undo it.

---

## WHY THIS JOB EXISTS (what the current app gets wrong)

The current app looks nothing like the Figma design. Treat these as bugs to fix:

1. Browser-default monospace (Courier-style) fonts are used for headings and labels, mixed with a different sans font for body text. It looks like an old website next to a modern one.
2. The theme is a blue-tinted dark (GitHub-dark style) with a bright green. The design is a **warm neutral near-black** with a soft mint green, signal orange and amber.
3. The dev debug bar sits above the header and overlaps or cuts it off (on Contracts and Flight the step tabs are hidden behind it).
4. Content does not fit the viewport. The header is clipped on the flight screen and pages get cut off.
5. Developer text leaks into the UI: `TODO`, `TODO(owner-4)`, "— kg", and "Requires $999999.0M".
6. Emoji are used as icons (confetti, planets, mute button).
7. Cards, tags, borders and corner radii are inconsistent.
8. The Contracts screen layout differs from the design (large stacked cards instead of a compact destinations list, a map, and a specs panel).
9. The flight landing bar uses blue and teal, and the telemetry card is unstyled.
10. The Results screen has no visual hierarchy (emoji heading, plain rows).

## FIGMA SOURCE

- File key: `0Rwp4kwZkBtHlkzKLB0hEv` (page "Page 2", node `21:702`). Link: https://www.figma.com/design/0Rwp4kwZkBtHlkzKLB0hEv/Untitled?node-id=25-4268
- Frames: `21:1337` Mission Select, `21:704` Hangar, `25:4268` Scavenge. The design shows six steps (00 Mission Select, 01 Hangar, 02 Pre-flight, 03 Flight, 04 Scavenge, 05 Results). **There are no frames for Pre-flight, Flight, Results, Home, Research or Team**, so build those in the same visual language (you may check page `21:702` for more frames first).
- Use the Figma MCP: start a session with the file key, load the `figma-design-to-code` guidance, then get the screenshot and design context of each frame. The generated React/Tailwind code is **reference only**. Rewrite it in our stack (vanilla TypeScript DOM, plain CSS, Canvas 2D). **Add no dependencies** (no React, no Tailwind). Download every icon and image into `src/ui/assets/` and never leave temporary Figma URLs in code.

## VERIFIED DESIGN TOKENS (read from the Figma header and the Surface Meters panel)

Use these exactly. Sample the remaining values (page background, danger red, hover and disabled states) from the design context of frames `25:4270` (main background) and `21:704`.

```css
:root {
  /* surfaces */
  --bg-inset:   #0e0e0f;  /* header, footer, gauge tracks */
  --bg-panel:   #1c1b1c;  /* nav groups, chips, inputs */
  --bg-card:    #201f20;  /* meter and stat cards */
  --border:     #2a2a2b;  /* all hairlines, 1px */

  /* text */
  --text:       #e5e2e3;  /* primary */
  --text-muted: #ab897f;  /* labels, secondary (warm tan) */

  /* accents */
  --accent:     #ff5a1f;  /* Signal Orange: active step, primary buttons, selected */
  --on-accent:  #541400;  /* text and dots on orange */
  --ok:         #61dda0;  /* soft mint: completed, nominal, funds, positive */
  --warn:       #ffba3b;  /* amber: warnings, "lost" data */
  --avatar:     #ffb59e;

  /* type */
  --font-ui:   "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Note: a layer name in Figma says Nominal Green `#1FA971`, but the actual fill used is `#61dda0`. Use `#61dda0`.

**Typography (from the design):**
- Wordmark: Geist Bold 15px, letter-spacing 0.75px.
- Active step label and titles: Geist SemiBold 13px.
- Micro-labels: JetBrains Mono Medium 10–11px, **uppercase**, letter-spacing 0.33–0.55px, colour `--text-muted`.
- Values: JetBrains Mono Bold 12px, and **28px** for hero values (battery, data, salvage).
- Section headings: JetBrains Mono Bold 12px, letter-spacing 0.6px.
- Load Geist and JetBrains Mono (both open source). Self-host the font files in `public/fonts/` with `font-display: swap`, or add a Google Fonts link in `index.html` as a fallback. Do not use the browser default monospace anywhere. Use a plain "✓" in the mono font or an SVG check.

**Style rules:** 1px hairline borders, no shadows, no glows, no gradients. Corner radius 0 for panels and buttons, 4px only for the step-nav container, round only for avatar and status dots. Meter bars are 6px high on an inset track. Icon buttons are 28px squares with a 1px border. One consistent icon set: 1.5px-stroke line icons as SVG, no emoji.

## THE APP SHELL (build once, use on every screen)

- **Layout:** the app fills the viewport (`100dvh`) as a grid: header 56px / main (fills the rest, panels scroll **inside** themselves) / footer 64px. There must be **no page-level scroll** on desktop. Test at 1280×720, 1440×900 and 1920×1080.
- **Header:** wordmark plus version tag (version from `package.json` via the existing build setup, or the existing value) / six-step nav in a bordered group (completed steps show a mint ✓, the active step is a solid orange block with `--on-accent` text, upcoming steps are muted, steps separated by a muted "/") / difficulty segmented control (EASY / NORMAL / HARD / SANDBOX, the active one on `#2a2a2b` with bold text) / funds chip (`FUNDS:` muted, amount in mint mono bold) / three 28px icon buttons (sound, pause, settings) / avatar circle.
- **Footer:** secondary buttons left, a centre status pill (craft name and status), **one** orange primary call-to-action on the right. One primary action per screen.
- **Step nav and difficulty switch:** keep their current behaviour exactly. You may disable (visually and with `aria-disabled`) steps the current code already does not allow, but do not change the rules.
- **Debug bar:** keep it, but make it a slim, collapsible strip at the **bottom-left** (or toggled with a keyboard shortcut) that never overlaps the header. Show it only in development builds (`import.meta.env.DEV`). "Run Mock Mission" must keep working.

## SCREENS

Restyle all nine phases. Keep each screen's existing data reads and handlers. Replace markup and CSS.

| Phase | Reference | Notes |
|---|---|---|
| `contracts` | Frame `21:1337` | Compact destinations list (icon, name, tier, status tag, distance, Δv), orbital map panel (SVG), body specs panel, environmental notices, and a contract card at the bottom. Render bodies and contracts from data (do not hard-code Europa). One primary CTA. |
| `hangar` | Frame `21:704` | Component categories, parts library with search and filters, blueprint canvas, part tuning sliders, live telemetry cards, advisories, installed-hardware rack. Locked parts greyed out with their reason. |
| `scavenge` | Frame `25:4268` | Action deck, radar canvas, surface meters, footer pill. A countdown timer must be clearly visible (the design has none, so add one in the same style). |
| `preflight` | none | Go/No-Go checklist cards (pass/warn/fail with colour and icon), summary of warnings and violations, Launch button. |
| `flight` | none | Canvas takes the centre, telemetry HUD as a card in the design style (mono labels, mint/amber/orange state colours), landing target shown with orange and mint rings instead of blue/teal. |
| `results` | none | Outcome banner, financial settlement table, score breakdown bars, flight analysis cards (good / warning / critical with left accent bar), mission timeline. No emoji. |
| `home`, `research`, `team` | none | Same shell and tokens. Home keeps its content with a clear hierarchy and one primary action. |

## DATA AND TEXT HYGIENE

- Never show `TODO`, `owner-N`, placeholder IDs, or debug text in the UI. Show `—` for missing values. If something is missing, log it with `console.debug` (dev only) and add it to `docs/UI_FLAGS.md`.
- Absurd placeholder values (for example "Requires $999999.0M") must not be shown as-is. Display "Locked" or "TBD" for values that are clearly placeholders (for example 10,000M or above), and **flag the data issue to me** rather than changing the data.
- Keep all existing `data-tutorial="<id>"` attributes working.

## UX IMPROVEMENTS YOU MAY MAKE (without changing behaviour)

Clear visual hierarchy (one focal point per screen), consistent spacing on a 4/8px grid, visible keyboard focus rings, hover/active/disabled states, tooltips from existing text, subtle 120–200ms transitions that respect `prefers-reduced-motion`, readable contrast (muted text must stay legible), truncation with tooltip instead of clipped text, and logical tab order. Desktop first (minimum about 1024px wide). Below that, let panels stack and scroll rather than overlap.

## HOW TO WORK

1. Read the project: `docs/CONCEPT.md`, `docs/CONTRACTS.md`, `docs/CONVENTIONS.md`, and every file in `src/ui/`. Run the app and click through all phases.
2. **Before changing anything**, run `npm run typecheck && npm run lint && npm test && npm run build` and note the results. Play the mock mission and note the numbers on the Results screen. They must be identical afterwards.
3. Write tokens and fonts, then the shell, then shared components (button, segmented control, chip/tag, stat card, meter single and two-tone, panel header, tooltip, part card, slider row, advisory card, icon set), then the screens in this order: contracts, hangar, scavenge, preflight, flight, results, home, research, team.
4. Commit in small steps (tokens, shell, components, one commit per screen) so I can review and revert.
5. Compare each screen with its Figma screenshot at 1280px width, and fix visible differences. Check at 1280×720 for clipping.

## FINISH

Run again and show me:
```bash
npm run typecheck && npm run lint && npm test && npm run build
git diff --name-only main...HEAD
```
Push `ui/restyle` only. I will review and merge.

## FINAL REPORT

Reply with:
1. The `git diff --name-only` output, and confirmation that no protected file was touched.
2. Every functionality concern you found and **did not** act on (file, reason), so I can raise it with my teammate.
3. Anything in the UI that depends on missing data (also in `docs/UI_FLAGS.md`).
4. Fonts and assets added, with licenses.
5. Before/after test and build results, and confirmation that the mock mission shows identical numbers.
6. Remaining visual differences from Figma you could not fix.
