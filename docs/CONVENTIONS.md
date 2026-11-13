# Conventions

## Units
All code uses SI units: kg, N, s, m, m/s, W, Wh, degrees (stored as degrees).
Money: USD millions — field names end in `M` (e.g. `costM`, `rewardM`).
Data volumes: MB. Data rates: kbps.

## Purity
All game logic functions are **pure**: inputs in, outputs out, no hidden global state.

## Randomness
All randomness goes through `src/core/rng.ts` (seedable, deterministic).
Never call `Math.random()` directly in game logic.

## Naming
- Files and folders: kebab-case
- Types and interfaces: PascalCase
- No default exports — always named exports
- Constants: SCREAMING_SNAKE_CASE

## Data source rule
Every number in JSON data files must have a `source` field: `"nasa"`, `"game"`, or `"fictional"`.
