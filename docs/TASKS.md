# First Tasks Per Owner

| Owner | Folder | Do First (Target: ~4h) |
|-------|--------|------------------------|
| 1 | `src/sim` | Moon landing playable in the flight canvas with keyboard controls, bullseye rings and touchdown classification |
| 2 | `src/builder` | Real `computeShipStats` with the rocket equation, mass, power, data and cost, plus live slider stats in the hangar UI |
| 3 | `src/economy` | Payout formula, funding gate, replay rule (30% if not a new record), wear model, save/load with tests |
| 4 | `src/data` | Expand `parts.json` and `bodies.json` first (by hour 2), then contracts, items, research; keep `DATA_AND_ASSUMPTIONS.md` current |
| 5 | `src/ui` | Make all screens navigable and consistently styled (theme, layout, HUD meters); then the hangar layout and scavenging live feed |
| 6 | `src/state`, `src/report` | Keep the full loop working as modules land; real `generateReport` with plain-language causes; tutorial text; deployment checks; pitch assets |

## Workflow
1. Each owner starts their real implementation immediately after `runMockMission()` works end-to-end.
2. Build against `src/mocks/` for anything from another owner's folder.
3. Feature flags gate unfinished features (see `src/config/feature-flags.ts`).
