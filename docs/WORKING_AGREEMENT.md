# Working Agreement

## The frozen contract
`src/types.ts` is frozen after setup. To change it: announce in team chat, edit in a tiny dedicated commit, everyone pulls immediately.

## Ownership
Only edit your own folder. If you need something from another folder, ask the owner or build against `src/mocks/`.

## Branching
Commit small and often straight to `main`. `main` must always build and run. Any unfinished feature goes behind a feature flag.

## Never block
Build against `src/mocks/` if the real implementation is not ready. Never sit idle waiting.

## Before pushing
Run: `npm run typecheck && npm run lint && npm test`

## Status updates
Post a one-line status in team chat every 2 hours.

## Merge conflicts
Avoid by staying in your folder. If you need a type change, announce it first.
