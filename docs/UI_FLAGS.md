# UI Flags & Data Hygiene Report

This document records presentation and data schema gaps identified during the UI restyle to the Figma specification, and the schema additions enabled by user permission.

## 1. Schema Additions & Scientific Data Population

With user permission to edit functionality and data code, the missing scientific properties identified in the Figma specs were integrated into `src/types.ts` and populated in `src/data/bodies.json` and `src/data/contracts.json` from NASA Planetary Fact Sheets:

| Screen | Property / Field | Scientific Source / Value | Status |
|---|---|---|---|
| `contracts.ts` | `body.escapeVelocityMs` | NASA Planetary Fact Sheet (Moon: 2380 m/s, Mars: 5030 m/s, Titan: 2640 m/s, Venus: 10360 m/s, Ryugu: 0.38 m/s) | Populated & Rendered |
| `contracts.ts` | `body.tempRangeC` | NASA Planetary Fact Sheet (e.g. Moon: −130°C to +120°C, Mars: −140°C to +20°C, Venus: +462°C) | Populated & Rendered |
| `contracts.ts` | `body.rotationPeriodH` | NASA Planetary Fact Sheet | Populated & Rendered |
| `contracts.ts` | `body.distanceAu` | Average solar orbital radius (AU) | Populated & Rendered |
| `contracts.ts` | `body.transitDays` | Hohmann transfer duration | Populated & Rendered |
| `contracts.ts` | `body.deltaVToOrbitMs` | Delta-V to low orbit from surface | Populated & Rendered |
| `contracts.ts` | `contract.requiredDeltaVMs` | Mission Δv requirement | Populated & Rendered |
| `contracts.ts` | `contract.targetAccuracyM` | Mission landing circle requirement | Populated & Rendered |
| `contracts.ts` | `contract.recommendedBaseline` | Mass cap, min TWR, and Δv margin guidelines | Populated & Rendered |
| `scavenge.ts` | `body.tempRangeC` | Surface temperature range | Populated & Rendered |
| `scavenge.ts` | Communication Window | Relay mode based on celestial body position | Populated & Rendered |

## 2. Placeholder Data Hygiene

| Screen | Raw Value / Issue | Resolution Applied |
|---|---|---|
| `contracts.ts` | Placeholder funding gate on `"tiny-world"` ($999,999\text{M}$) | Updated to realistic pinnacle campaign value ($500\text{M}$) |
| `contracts.ts`, `hangar.ts`, `scavenge.ts` | Developer text leaks: `TODO(owner-N)` tags in UI attributes/text | Removed from DOM and rendered clean |
| `hangar.ts` | Missing dry mass / mass units formatting | Standardised to `t` (tonnes) |
| All screens | Emoji icons (`🚀`, `✅`, `🚫`, `⚠️`, etc.) | Replaced with SVG line icons (1.5px stroke) or clean text badges |

## 3. UI Interactions & Stubs

| Screen | Interaction | Current Behavior |
|---|---|---|
| `hangar.ts` | Staging Sequence, ISO, WIRE tabs | Disabled with tooltip indicating future support |
| `scavenge.ts` | Action Deck buttons (Deploy Instrument, Send Data, Collect Sample) | Clickable / state-dependent without breaking sim |
| `scavenge.ts` | Return to Orbit | Transitions to Results screen safely |
| `scavenge.ts` | Item radar positions | Deterministically seeded from itemId hash |
