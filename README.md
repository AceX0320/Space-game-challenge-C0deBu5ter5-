# Launchsmith 🚀

**NASA Space Apps Challenge 2026 — Space Mission Design Game**

Build your own spacecraft from tunable parts, fly it, land it on a bullseye, and live with the financial and mechanical consequences of every choice.

In flight, launch from Earth with the throttle controls, follow the live route to your contract's destination, then steer and manage throttle for landing. Use **W / Space / ↑** to thrust, **A / ←** and **D / →** to steer, or use the on-screen hold controls and throttle slider.

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run all tests with Vitest |
| `npm run typecheck` | TypeScript type-check only |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Folder Map

| Folder | Owner | Contents |
|--------|-------|----------|
| `src/sim` | Owner 1 | Flight physics, landing, malfunctions |
| `src/builder` | Owner 2 | Ship-stat computation, design validation |
| `src/economy` | Owner 3 | Payout, wear, streaks, scavenging, save/load |
| `src/data` | Owner 4 | JSON data files and typed loaders |
| `src/ui` | Owner 5 | Screens, router, components, styles |
| `src/state` + `src/report` | Owner 6 | Store, phase machine, mission report, deployment |
| `src/core` | Setup | RNG, units, validation utilities |
| `src/mocks` | Setup | Mock data everyone builds against |
| `docs/` | Owner 6 | All documentation |

## Deployment

The game deploys automatically to GitHub Pages on every push to `main`.
**One-time human step:** enable GitHub Pages in repository Settings → Pages → Source: GitHub Actions.

Live URL (after setup): https://AceX0320.github.io/Space-game-challenge-C0deBu5ter5-/

## Docs

- [Design Concept](docs/CONCEPT.md)
- [Conventions](docs/CONVENTIONS.md)
- [Shared Contracts](docs/CONTRACTS.md)
- [Working Agreement](docs/WORKING_AGREEMENT.md)
- [Data & Assumptions](docs/DATA_AND_ASSUMPTIONS.md)
- [Task List](docs/TASKS.md)
