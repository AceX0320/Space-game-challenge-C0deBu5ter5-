# Data and Assumptions

All values used in the game are labelled by source: `nasa` (real, cited), `game` (invented for balance), `fictional`.

| Value | File | Source | Note |
|-------|------|--------|------|
| Moon gravity 1.62 m/s² | bodies.json | nasa | NASA Planetary Fact Sheet |
| Mars gravity 3.72 m/s² | bodies.json | nasa | NASA Planetary Fact Sheet |
| Titan gravity 1.35 m/s² | bodies.json | nasa | NASA Planetary Fact Sheet |
| Venus gravity 8.87 m/s² | bodies.json | nasa | NASA Planetary Fact Sheet |
| Asteroid gravity 0.003 m/s² | bodies.json | game | Representative small body |
| Standard gravity g0 = 9.80665 m/s² | constants.ts | nasa | NIST/IAU definition |
| All part stats (mass, thrust, cost) | parts.json | game | Tuned for gameplay balance |
| Starting funds, budget caps, rewards | contracts.json | game | Tuned for gameplay balance |
| Scavenge item yields | items.json | game | Inspired by real findings |
| Microbial life on Titan | items.json | fictional | Speculative, clearly labelled |
| Difficulty budget modifier — easy 1.5×, normal 1.0×, hard 0.8× | constants.ts | game | Tuned for accessibility vs challenge balance |
| Difficulty landing ring scale — easy 1.5×, normal 1.0×, hard 0.6× | constants.ts | game | Wider rings on easy, tighter on hard |
| Saturn V liftoff TWR ≈ 1.16 | tutorial.ts (STAT_TOOLTIPS) | nasa | // VERIFY: Apollo 11, as-built mass sheets (NASA SP-2004-4210) |
| LEO Δv ≈ 9,400 m/s | tutorial.ts (STAT_TOOLTIPS) | nasa | // VERIFY: varies 9,100–9,800 m/s depending on trajectory and gravity losses |
| Solar flux threshold for RTG lockout < 0.4 W/m² | tutorial.ts (getLockReason) | game | Past Mars (~586 W/m²); Jupiter ~50 W/m² (solarFlux in bodies.json is W/m² at surface) |
