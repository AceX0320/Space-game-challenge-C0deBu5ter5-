# Launchsmith (working title) — Space Mission Design Game

NASA Space Apps Challenge 2026 · Challenge: *Space Mission Design Game*

A game where you **build your own spacecraft from tunable parts, fly it, land it on a bullseye, and live with the financial and mechanical consequences of every choice.** Each mission asks for a science goal. Your design has to deliver it within a budget, a mass limit, a power limit, a data limit and a lifetime, and the money you spend decides whether you can afford the next mission.

---

## 1. My assessment of your ideas

| Your idea | Verdict | Notes |
|---|---|---|
| Scrap Mechanic-style ship building | Good, but change the form | Fully free block building is too large for 48 hours and gives unpredictable physics. Use a **slot-based builder with tunable parameters** per part (section 5). |
| Unlimited resources | Bad as the default | The challenge asks for *limited* resources and trade-offs. With no limits there is nothing to balance. Keep it as **Sandbox mode**. Your alternative (a money limit that grows with each completed contract) is the right default. |
| More engines = more power and control, more fuel use | Good | Add mass and efficiency to make it a real trade-off (section 6). |
| Streak multipliers lost on failure | Good | Keeps the stakes high. Adds one optional safety valve (section 9). |
| Spending is cumulative, so you replay old missions with cheaper builds | Very good | This is the core loop. Needs a rule against farming (section 7). |
| Wear and tear, faster on higher difficulty | Very good | Mirrors real maintenance and reliability engineering. |
| Landing circle like a dartboard | Very good | Instantly readable. Add landing limits (speed, tilt) so it is not only about position. |
| Atmosphere drag and entry heating | Good | Keep it simplified: drag, heat shield, parachute. |
| Malfunctions on higher difficulty | Good | Only on Hard. Redundancy becomes the answer, which links to real engineering. |
| "Modify everything about every component" | Good in spirit | Limit to 3–5 meaningful parameters per part so the player can understand the effects. |
| "The objective is always to design the spaceship" | Needs changing | The challenge wants the player to **define a mission objective first**. Each mission should have its own science goal, and the ship is built to serve it. |

---

## 2. The core loop

1. **Pick a contract.** It has a science objective, a target body, a budget cap and a reward.
2. **Design the ship** in the builder. Stats update live.
3. **Pre-flight review (Go/No-Go).** Shows mass, Δv, power, data budget and part reliability, including the risk of failure from worn parts.
4. **Fly it.** Ascent, transit (fast-forward with events), entry and descent, landing.
5. **Operate and scavenge.** Science instruments run, data is generated, and the antenna must downlink it before the mission ends. While the mission clock runs, the ship scavenges the planet automatically (section 10A).
6. **Post-mission report.** Explains why it worked or failed and what to change.
7. **Get paid (or not).** Net profit decides whether you reach the funding target to unlock the next contract. Repair, replace or redesign, and go again.

---

## 3. Mission phases

| Phase | What the player does | What it tests |
|---|---|---|
| Design | Builds the ship, selects instruments, picks orbit/trajectory option | Trade-offs under constraints |
| Ascent | Flies a short, simplified take-off (throttle, pitch) | Engine choice, fuel use, control |
| Transit | Fast-forward; random events; optional mid-course correction | Fuel margin, power, reliability |
| Entry and descent | Atmosphere drag and heating, optional parachute, powered descent | Mass, heat shield, thrust-to-weight |
| Landing | Steers to the bullseye and touches down within speed and tilt limits | Control authority, leg design |
| Operations | Instruments run, data is stored and downlinked | Power, data, comms, lifetime |
| Report | Score and root-cause analysis | Learning |

**Simplification (state this to judges):** ascent and transit are stylised and scaled for gameplay. Transit is not a real orbital simulation.

---

## 4. Builder: components and tunable parameters

Each part has a small set of sliders. The game computes the **derived stats**: total mass, Δv, thrust-to-weight ratio, power balance, data budget and cost.

| Part | Tunable parameters | Effects |
|---|---|---|
| Engine(s) | Count, size/thrust, efficiency vs power (specific impulse), gimbal range | Thrust, fuel flow, mass, cost, control, wear rate |
| Fuel tanks | Volume | Fuel mass, dry mass, cost, Δv |
| RCS thrusters | Count, strength | Attitude control, small corrections, fuel use |
| Landing legs | Count (3–4), length, footpad width, shock absorber stiffness | Stability, tolerable touchdown speed, slope tolerance, mass |
| Hull/structure | Size, material | Mass, strength, wear resistance, cost |
| Power | Solar panel area, battery capacity, optional RTG | Power available in light and shadow, mass, cost |
| Communications | Antenna size/type | Data rate, power draw, mass |
| Flight computer | Tier | Level of stabilisation assist, cost, power |
| Instruments | Camera, spectrometer, drill, seismometer, weather station | Mass, power, data rate, cost, science value (only counts if compatible with the objective) |
| Heat shield | Size | Survives entry heating, mass, cost, single-use |
| Parachute | Size | Strong drag in atmosphere, mass, single-use |

**Rule from the NASA "Learning Game About Telescopes" resource:** options that are incompatible with the objective are locked out and explain why, so the player learns that the objective drives the design.

---

## 5. Trade-offs

### Your four, refined

1. **Power vs fuel (engines).** More or larger engines give more thrust and control but burn more fuel and weigh more. Add the rocket-equation effect: more fuel adds mass, which needs more fuel.
2. **Risk vs reward on streaks.** Clean flying earns multipliers that are lost if the mission fails.
3. **Spending vs profit (funding gate).** Money is cumulative. A lavish build can succeed but leave you short of the funding target, so you replay earlier contracts with leaner designs.
4. **Wear vs cost.** Reusing old parts saves money but raises failure risk. Repair or replace costs money. Higher difficulty wears parts faster.

### Added

5. **Thrust vs efficiency.** High-thrust engines land hard missions but burn fuel fast. High-efficiency engines save fuel but have low thrust, so they cannot hover on a heavy planet.
6. **Mass vs everything.** Every part adds mass, which needs more thrust and fuel, which adds more mass. Shown with a live Δv and thrust-to-weight meter.
7. **Data vs communications.** Instruments generate data. If the antenna cannot downlink it before the mission ends, **science value is lost**. Bigger antennas cost mass and power.
8. **Power balance.** Instruments, antenna and computer all draw power. Solar panels are light but weak far from the Sun or in shadow. Batteries cover dark periods but are heavy.
9. **Redundancy vs mass and cost.** A spare engine or backup battery protects against malfunctions (Hard mode) but adds weight and money.
10. **Margins vs efficiency.** Carrying extra fuel and power margin is safe but expensive. Running lean scores higher on efficiency but leaves no room for events. This mirrors real NASA practice.
11. **Landing legs: stability vs mass.** Long, wide legs forgive slopes and tilt but weigh more. Short legs are light but unforgiving.
12. **Single-use vs reusable protection.** Heat shields and parachutes are cheap per mission but single-use. Heavier reusable options cost more up front.
13. **Repair vs replace.** Repair is cheaper but each repair permanently lowers a part's maximum condition, so eventually it must be replaced.
14. **Ambition vs reliability.** Optional bonus objectives raise the reward but add instruments, mass and risk.
15. **Scavenging yield vs mission time and power.** Longer stays and more instruments find more, but wear parts, drain power and fill the data buffer. Stay too long and the ship fails before the haul is sent home (section 10A).
16. **Research time vs money.** Researching finds costs funds and time, but unlocks better parts and new resources that make later missions cheaper or more valuable.

There is **no single perfect build**: a heavy, safe ship and a light, risky ship can both complete the same contract.

---

## 6. Economy

**Mission result**

```
Net result = Reward × (Landing multiplier × Science multiplier × Streak multiplier)
             − Build cost − Launch cost − Repair/replacement cost
```

**Funding gate:** each contract unlocks the next only when **total funds** reach a target. Spending too much means a successful mission can still leave you short.

**Worked example (starting values, to be tuned)**

| Item | Value |
|---|---|
| Funds before mission | $60M |
| Build + launch cost | $50M |
| Reward after multipliers | $60M |
| Funds after | $70M |
| Gate for next contract | $80M |

The player landed successfully but is $10M short. They replay the contract with a leaner build and unlock the next one.

**Anti-farming rule:** replaying a completed contract pays full reward only if the net profit beats your previous best on that contract. Otherwise it pays a reduced reward (suggested 30%). This stops repeating the same easy mission and pushes the player to optimise.

**Progression:** each completed contract raises the budget cap (your "money limit increases with completed challenges"), so bigger ships become possible gradually.

---

## 7. Flight mechanics

### Physics model (simple, 2D side view)

- Gravity depends on the target body.
- Thrust, fuel flow and mass change as fuel burns.
- Δv from the rocket equation: `Δv = Isp × g0 × ln(m_start / m_end)`.
- Atmospheric drag: `F = ½ × ρ × v² × Cd × A`, with density falling with altitude.
- Entry heating grows with density and speed; the heat shield must cover it.

### Starting values for target bodies (game-simplified, verify against NASA Planetary Fact Sheet)

| Body | Surface gravity (m/s²) | Atmosphere | Gameplay |
|---|---|---|---|
| Moon | ~1.6 | None | Pure powered descent, no drag |
| Mars | ~3.7 | Very thin | Parachute helps but is not enough alone |
| Titan | ~1.35 | Thick | Heavy drag, low gravity, parachute is very effective |
| Venus | ~8.9 | Extremely thick, hot | Short lifetime, extreme heating |
| Asteroid/dwarf planet | <0.3 | None | Gentle touch-down, escape risk |

### Landing target (bullseye)

- Concentric rings. The closer to the centre, the higher the landing score (example: 100 / 80 / 60 / 40 / 20).
- Ring size shrinks with difficulty.
- **Landing limits** make it more than a position game: vertical speed, horizontal speed and tilt angle. Leg design sets the limits.

| Outcome | Condition | Result |
|---|---|---|
| Soft landing | All limits respected | Full reward, ring score applies |
| Rough landing | One limit exceeded slightly | Parts damaged, mission continues with reduced science |
| Crash | Limits badly exceeded | Mission failed, streaks lost, parts destroyed or heavily worn |

### Wear and tear

- Every part has a **condition** (0–100%).
- Wear per mission depends on use and difficulty (Easy: none, Normal: standard, Hard: roughly 1.5–2× faster).
- Failure risk is zero while condition is high and rises sharply as it drops. The Go/No-Go screen shows the risk as a percentage.
- Repair restores condition but lowers maximum condition permanently.
- A part that breaks mid-mission is a real consequence (lost thrust, lost power, lost comms).

### Malfunctions (Hard mode only)

One or more random events per mission, for example: engine-out, sensor drift (HUD reading off), power brownout, comms blackout, stuck gimbal, fuel leak. Redundancy and margins are how the player prepares.

---

## 8. Scoring and streaks

**Score components:** mission success, landing accuracy, science delivered, resource efficiency (science per dollar), and decision quality (margins used well, no wasted mass).

**Streak tracks (examples)**

| Streak | Condition |
|---|---|
| Clean Ascent | Ascent fuel use below X% of planned |
| Smooth Hands | Few control corrections during ascent and landing |
| Pinpoint | Landing inside the top rings |
| Soft Touch | Touchdown speed under 50% of the limit |
| Frugal | Build cost under 70% of the contract cap |

- Each track adds a multiplier bonus the longer it continues (suggested cap: ×2.0 total).
- **All streaks are lost if the mission fails** (crash, abort or out of fuel).
- **Optional safety valve:** a purchasable one-use "Safety Net" that protects streaks once. It adds a risk-vs-cost decision and softens frustration.

---

## 9. Difficulty and modes

| Mode | Resources | Wear | Malfunctions | Landing ring | Help |
|---|---|---|---|---|---|
| Easy | Generous budget | Off | Off | Large | Hints and assist |
| Normal | Standard budget cap | Standard | Off | Medium | Tooltips |
| Hard | Tight budget | Fast | On | Small | Minimal |
| **Sandbox** | **Unlimited money** | Off | Optional | Any | None (your "unlimited resources" idea lives here) |

---

## 10. Suggested campaign (6 contracts)

1. **First Light:** Moon, simple landing, teaches builder and bullseye.
2. **Eyes on Mars:** thin atmosphere, introduces drag and parachute.
3. **Listen to the Moon:** seismometer mission, data and comms trade-off.
4. **Titan Descent:** thick atmosphere, low gravity.
5. **Hot Neighbour:** Venus, extreme heat, short mission lifetime.
6. **Tiny World:** low-gravity asteroid touch-down, precision and fuel margin.

Structure the campaign like NASA's Concept Maturity Levels: early contracts are simple concepts, later ones require full designs with margins and redundancy.

---

## 10A. Scavenging and research (planets as the main objective)

Each planet or moon is the **main objective** of a contract. Once the ship lands, the player does not control a character. The game runs an automatic **scavenging phase** with a countdown timer, and a live feed shows what is being found.

### Scavenging phase

- **Timer = mission lifetime.** It depends on power (solar and battery), part condition, and the environment (for example Venus ends quickly).
- **Yield depends on the design:**
  - Instruments installed (a drill finds subsurface samples, a spectrometer identifies minerals)
  - Power available to run them
  - Data storage and downlink capacity (finds that are not transmitted or stored are lost)
  - Landing quality: a bullseye landing puts you near the richest zone, a rough landing damages instruments and reduces yield
- **Live display:** time remaining, power, data buffer, and a log of items found as they appear.
- **End of timer:** a results screen lists everything collected, what was lost, and why.
- **Risk:** worn parts or Hard-mode malfunctions can cut the phase short.

### Items found (examples, game values)

| Planet/body | Possible finds | Notes |
|---|---|---|
| Moon | Regolith samples, water ice (polar), helium-3 (fictional use) | Low gravity, no atmosphere |
| Mars | Iron-rich rock, perchlorate salts, subsurface ice, organic traces | Thin atmosphere, dust |
| Titan | Hydrocarbons, ice samples, organic compounds | Thick atmosphere, cold |
| Venus | Rare minerals, atmospheric samples | Very short lifetime |
| Asteroid | Metals, carbon-rich material | Tiny gravity, precision landing |

Label each item as **NASA-derived** (real science findings) or **game value**.

### Research

- Items collected are brought back and **researched** in a lab screen between missions.
- Research costs **funds and time** (a number of missions or a timer).
- Results unlock new content:
  - **New parts and upgrades** (better engines, lighter alloys, stronger shields)
  - **New resources** that feed back into the economy
  - **New instruments** and mission options
  - **Discoveries** (for example "organic traces" opens an astrobiology contract)
- A simple **research tree** (3–4 branches: propulsion, materials, power, science) keeps it understandable.
- **Creatures:** clearly fictional. Fits as a late-game discovery (for example a microbial find on Titan) rather than a core system.

### Why it works

- It gives each planet a reason to visit and a different feel.
- It gives players a progression goal beyond money.
- It makes landing precision, power, data and wear matter during the whole stay, not only at touchdown.

### Scope

- **MVP:** the timer, an automatic item-found feed, a results screen, and 3–5 researchable items that unlock 2–3 upgrades.
- **Stretch:** the full research tree, creatures, and unique finds per planet.

---

## 11. Team mode (up to 4 players)

| Role | Owns | Cares about |
|---|---|---|
| Mission Director | Objective, budget, final approval | Reward vs cost |
| Spacecraft Engineer | Engines, tanks, legs, hull | Mass, Δv, thrust-to-weight |
| Science Lead | Instruments | Science value, data volume |
| Operations | Power, comms, wear/repair | Power balance, downlink, reliability |

- The **Pilot** is whoever flies the landing (rotating or chosen by the team).
- **Design review:** any role can raise a concern flag that must be resolved or accepted as risk. Accepted risks raise failure probability.
- **Team bonus:** a bonus applies when the design is approved with no unresolved flags.
- **MVP form:** shared screen or hot-seat (pass the console, each role decides its part). Real-time online play is a stretch goal.
- **Solo play:** the player controls all roles, with optional advisor tips.

---

## 12. Education layer and post-mission report

- Short "why" tooltips on every stat (for example, why more fuel needs more thrust).
- Live meters: Δv budget, thrust-to-weight, power balance, data buffer vs downlink.
- Locked options explain their incompatibility.
- **Post-mission report:** timeline of events, resource graphs, and root-cause statements such as *"Landing failed: vertical speed 9 m/s exceeded leg limit of 6 m/s. Thrust-to-weight at touchdown was 1.1, too low to slow down."* followed by suggested changes.
- Final report can show similar real NASA missions (as in the telescope game resource).

---

## 13. Challenge compliance

| Challenge item | Where it is covered |
|---|---|
| Define mission objective and requirements first | Contract screen (section 2) |
| Design spacecraft and scientific payload | Builder (section 4) |
| Choose launch vehicle and orbit | Launcher stack and trajectory option in the builder; presets on Easy |
| Constraints: budget, mass, power, comms, data, lifetime | Trade-offs 3, 6, 7, 8 and the pre-flight review |
| Simulate and evaluate | Flight phases and scoring (sections 3, 7, 8) |
| Clear UI, configuration, resource management | Builder and live meters |
| Up to 4 players | Team mode (section 11) |
| Feedback on why success or failure | Post-mission report (section 12) |
| Different difficulty levels and scenarios | Section 9 and 10 |
| Optional extras (random events, report, save/share, sandbox, leaderboard) | Malfunctions, report, design codes, Sandbox, leaderboard |

**How the NASA resources are used**

| Resource | Use in the game |
|---|---|
| Design and Develop Science Missions | Mission model split into launch, space, ground and user segments |
| General Mission Analysis Tool (GMAT) | Reference for realistic orbit and Δv numbers |
| Concept Maturity Levels | Campaign progression |
| Mission Design Lab | Role design and review stages |
| NASA Mission Viz | Trajectory display inspiration |
| A Learning Game About Telescopes | Locked incompatible options, three levels, real-mission matching |
| CubeSat 101 | Mission-phase vocabulary |

**Data honesty rule:** label every number in the game as either **NASA-derived** or **game value**. Put the list in a short "Data and assumptions" page.

---

## 14. Scope for 48 hours

**Must have (MVP)**
- Builder with the core parts and live derived stats
- One or two bodies (Moon plus Mars) with landing physics and bullseye scoring
- Budget, mass, power and data limits shown clearly
- Funding gate and replay rule
- Wear and repair
- Score plus post-mission report
- Easy / Normal / Hard difficulty
- Scavenging timer with automatic finds and a results screen (3–5 items)

**Should have**
- Streak multipliers
- Atmosphere (drag, heat shield, parachute)
- Hot-seat team roles
- Malfunctions on Hard
- Sandbox
- Basic research screen that unlocks 2–3 upgrades from found items

**Stretch**
- More bodies, ascent phase polish, 3D hangar preview
- Full research tree and fictional creatures
- Share design via a code or link, leaderboard
- Online real-time team mode

**Suggested stack:** web (TypeScript + Canvas 2D or Phaser), custom simple physics integrator, state in localStorage, deployed as a static link so judges can open it instantly.

**Suggested workstreams:** physics/simulation, builder UI, economy and scoring, report and tutorials, art/UX and pitch.

---

## 15. Removed

| Removed | Reason |
|---|---|
| Unlimited resources as the main mode | The challenge centres on limited resources and trade-offs. Without limits there is no decision to make. Kept only as Sandbox. |
| Scrap Mechanic-style free block building | Too large for 48 hours, and arbitrary shapes give unpredictable stats and physics. Replaced by a slot-based builder with tunable parameters. |
| "Objective is always to design the spaceship" | The challenge asks players to define a mission objective before the engineering. Each contract now carries its own science goal. |
| Real orbital mechanics for transit | A full simulation is not needed to teach the trade-offs and would take too long to build and balance. Transit is a stylised fast-forward with events. |
| Modifying every property of every part | Too many sliders make effects impossible to understand. Limited to 3–5 meaningful parameters per part. |
| Malfunctions on Easy and Normal | Random failures on lower difficulties would feel unfair while players are still learning. Hard mode only. |
| Unlimited repeat payouts when replaying | Would allow farming the same easy mission. Replaced by the "beat your best" rule. |

**Deferred (not in the MVP, but possible later)**
- Real-time online multiplayer: hot-seat team mode delivers the collaboration requirement without networking risk.
- Realistic 3D vehicle models and trajectories: a 2D view is enough to show the trade-offs.

---

## 16. Questions for your team

1. Do you want the ascent to be a player-flown phase, or a short preset sequence with the launch fuel cost applied automatically?
2. Is the Safety Net item acceptable, or should failure always wipe all streaks?
3. How many contracts can you realistically finish and balance in the time available?
4. Hot-seat or shared-screen for the team mode demo?
