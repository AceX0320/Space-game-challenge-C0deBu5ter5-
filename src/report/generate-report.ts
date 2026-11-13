import type {
  Body,
  Contract,
  MissionEvent,
  MissionReport,
  MissionResult,
  PayoutResult,
  ReportItem,
  ShipStats,
} from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a mission-elapsed time in seconds as "T+m:ss". */
function formatT(tS: number): string {
  const absS = Math.abs(Math.round(tS));
  const m = Math.floor(absS / 60);
  const s = absS % 60;
  return `T+${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// NASA mission lookup table
// Each entry carries a // VERIFY: comment so the team can fact-check the notes.
// ---------------------------------------------------------------------------

type NasaRef = { mission: string; note: string };

/** Return a NASA analogue mission for the given cause tag, or null when none fits. */
function nasaRef(tag: 'speed' | 'parachute' | 'comms' | 'power' | 'tilt' | null): NasaRef | null {
  if (tag === null) return null;
  const TABLE: Record<typeof tag, NasaRef> = {
    // VERIFY: Mars Polar Lander was lost in 1999; leading hypothesis is spurious landing-leg
    // deployment signal causing premature engine cutoff ~40 m above surface.
    speed: {
      mission: 'Mars Polar Lander (1999)',
      note: 'Likely lost to premature engine cutoff during terminal descent — a reminder that touchdown speed margin is critical.',
    },
    // VERIFY: Phoenix used a pulsed descent engine scheme validated by Mars Pathfinder airbags
    // before it; first fully successful powered landing since Viking.
    parachute: {
      mission: 'Phoenix Mars Lander (2008)',
      note: 'Successfully used a parachute + powered descent sequence, proving the technique for future Mars missions.',
    },
    // VERIFY: Galileo's high-gain antenna failed to fully deploy in 1991, reducing data rate
    // by a factor of ~100,000; mission salvaged by deep-space network upgrades.
    comms: {
      mission: 'Galileo (1995–2003)',
      note: 'High-gain antenna failed to deploy; a bottlenecked downlink dramatically cut science return — a cautionary tale on comms margins.',
    },
    // VERIFY: Opportunity's final dust storm (2018, Opportunity Valley) blocked solar power
    // for months; last contact 10 June 2018.
    power: {
      mission: 'Opportunity Rover (2018)',
      note: 'A global Martian dust storm cut solar power below survival threshold, ending 15 years of operations.',
    },
    // VERIFY: No single famous mission purely for tilt; using InSight as it landed on a slight
    // slope and had to adjust instrument placement accordingly.
    tilt: {
      mission: 'InSight Lander (2018)',
      note: 'Touched down on a tilted surface; landing-leg stance width and shock absorption matter for stability.',
    },
  };
  return TABLE[tag];
}

// ---------------------------------------------------------------------------
// Main report generator
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive post-mission report explaining why the mission
 * succeeded or failed.
 *
 * Rules (see ai-ide-merge-content-prompt.md §Report.js):
 *  1. Never recompute money — read everything from `payout`.
 *  2. Use `result.flight.outcome` for FlightOutcome. Never downgrade a crash.
 *  3. Evaluate causes in priority order: heat → speed/tilt → fuel → surface → data.
 *  4. Null-guard `result.scavenge` — skip surface checks when it is null.
 *  5. Timeline: merge flight.events + scavenge?.events, sort ascending by tS.
 *
 * See concept file section 12 (Education layer and post-mission report).
 * TODO(owner-6): expand real NASA mission matching and deeper root-cause telemetry.
 */
export function generateReport(
  contract: Contract,
  stats: ShipStats,
  result: MissionResult,
  payout: PayoutResult,
  body?: Body
): MissionReport {
  const { flight, scavenge } = result;
  const causes: ReportItem[] = [];
  const suggestions: string[] = [];
  let nasaTag: 'speed' | 'parachute' | 'comms' | 'power' | 'tilt' | null = null;

  // -------------------------------------------------------------------------
  // 1. Determine headline from actual FlightOutcome (never reclassify crash)
  // -------------------------------------------------------------------------
  let headline: string;
  switch (flight.outcome) {
    case 'soft':
      headline = `Soft landing on ${contract.bodyId} — mission complete`;
      break;
    case 'rough':
      headline = `Hard landing — spacecraft sustained damage on touchdown`;
      break;
    case 'crash':
      headline = `Crash: spacecraft destroyed on impact`;
      break;
    case 'abort':
      headline = `Mission aborted`;
      break;
  }

  // -------------------------------------------------------------------------
  // 2. Priority-ordered cause analysis
  // -------------------------------------------------------------------------

  // — Priority 1: heat (burn-up during descent) —
  const maxHeat = flight.maxHeatMJ;
  const heatCap = stats.heatCapacityMJ;
  if (maxHeat !== undefined && heatCap !== undefined && maxHeat > heatCap) {
    // This always produces a crash; override headline to be specific
    headline = `Crash: heat shield capacity exceeded — spacecraft burned up`;
    causes.push({
      severity: 'critical',
      text: `Peak heating (${maxHeat.toFixed(1)} MJ) exceeded the heat shield capacity of ${heatCap.toFixed(1)} MJ. The spacecraft disintegrated during atmospheric entry/descent.`,
    });
    suggestions.push('Add a heavier heat shield or reduce entry velocity via a higher apoapsis approach.');
  }

  // — Priority 2: touchdown speed / tilt —
  if (flight.outcome === 'crash' || flight.outcome === 'rough') {
    const speedOver =
      Math.abs(flight.touchdownVyMs) > stats.touchdownLimits.maxVyMs;
    const tiltOver = flight.touchdownTiltDeg > stats.touchdownLimits.maxTiltDeg;

    if (speedOver) {
      const tooLowTWR = stats.twr < 1.2;
      causes.push({
        severity: flight.outcome === 'crash' ? 'critical' : 'warning',
        text: `Vertical speed at touchdown (${Math.abs(flight.touchdownVyMs).toFixed(1)} m/s) exceeded the leg structural limit of ${stats.touchdownLimits.maxVyMs} m/s.`,
      });
      if (tooLowTWR) {
        suggestions.push('Add stronger engines or reduce ship mass to improve TWR for terminal braking.');
      } else {
        suggestions.push('Install stiffer shock absorbers or add more propellant for a wider terminal-descent margin.');
      }
      nasaTag = 'speed';
    }

    if (tiltOver) {
      causes.push({
        severity: flight.outcome === 'crash' ? 'critical' : 'warning',
        text: `Landing tilt (${flight.touchdownTiltDeg.toFixed(1)}°) exceeded the ${stats.touchdownLimits.maxTiltDeg}° stability limit — the spacecraft tipped over.`,
      });
      suggestions.push('Use wider-stance or longer landing legs, or add more RCS authority to hold attitude at touchdown.');
      if (nasaTag === null) nasaTag = 'tilt';
    }

    // Soft/rough with no specific cause flagged
    if (!speedOver && !tiltOver && flight.outcome === 'rough') {
      causes.push({
        severity: 'warning',
        text: 'Touchdown speed or tilt pushed landing gear near its mechanical threshold, causing minor structural damage.',
      });
      suggestions.push('Reduce descent rate and ensure the ship is upright at engine cutoff.');
    }
  }

      // Successful landing acknowledgement (soft)
      if (flight.outcome === 'soft' && causes.filter((c) => c.severity === 'critical').length === 0) {
        // Only add success item when no burn-up was flagged
        if (maxHeat === undefined || heatCap === undefined || maxHeat <= heatCap) {
          causes.push({
            severity: 'good',
            text: `Touchdown speed (${Math.abs(flight.touchdownVyMs).toFixed(1)} m/s) was within the ${stats.touchdownLimits.maxVyMs} m/s leg limit — textbook landing.`,
          });
          nasaTag = 'parachute'; // show a successful-landing NASA mission
        }
      }

      // — Priority 3: fuel margin —
      const fuelPct = stats.fuelMassKg > 0 ? flight.fuelLeftKg / stats.fuelMassKg : 1;
      if (fuelPct < 0.05 && flight.outcome !== 'crash') {
        causes.push({
          severity: 'warning',
          text: `Only ${(fuelPct * 100).toFixed(1)}% propellant remained after landing — razor-thin margin.`,
        });
        suggestions.push('Add a larger propellant tank or switch to a higher-Isp engine to widen your Δv reserve.');
      }

      // -------------------------------------------------------------------------
      // 3. Surface / scavenge checks (skip entirely when scavenge is null)
      // -------------------------------------------------------------------------
      if (scavenge !== null) {
        // — Priority 4: power loss —
        if (scavenge.endedBy === 'power') {
          causes.push({
            severity: 'warning',
            text: `Surface power was exhausted after ${scavenge.timeUsedS.toFixed(0)} s, cutting scientific operations short.`,
          });
          const fluxNote =
            body !== undefined ? ` Solar irradiance at ${body.name} is ${body.solarFlux.toFixed(2)} W/m².` : '';
          suggestions.push(
            `Add larger solar arrays or a battery pack with higher Wh capacity.${fluxNote} Consider an RTG for low-flux bodies.`
          );
          if (nasaTag === null) nasaTag = 'power';
        }

        // — Priority 5: data —
        const dataLoss = scavenge.dataGeneratedMB - scavenge.dataSentMB;
        if (dataLoss > 0.1) {
          causes.push({
            severity: 'warning',
            text: `${dataLoss.toFixed(1)} MB of science data was generated but never transmitted (sent ${scavenge.dataSentMB.toFixed(1)} / ${scavenge.dataGeneratedMB.toFixed(1)} MB).`,
          });
          if (scavenge.endedBy === 'data-full') {
            suggestions.push('Equip a high-gain dish antenna or upgrade data buffer storage to avoid buffer overflow.');
            if (nasaTag === null) nasaTag = 'comms';
          } else {
            suggestions.push('Increase downlink bandwidth or allow more surface time to transmit buffered data.');
            if (nasaTag === null) nasaTag = 'comms';
          }
        } else {
          causes.push({
            severity: 'good',
            text: `Downlinked ${scavenge.dataSentMB.toFixed(1)} MB of scientific findings — full data return achieved.`,
          });
        }
      } else {
        // No surface operations
        if (flight.outcome === 'soft' || flight.outcome === 'rough') {
          causes.push({
            severity: 'info',
            text: 'No surface science was collected on this mission.',
          });
        }
      }

      // -------------------------------------------------------------------------
      // 4. Financial summary (read from payout — never recompute)
      // -------------------------------------------------------------------------
      if (payout.netM >= 0) {
        causes.push({
          severity: 'good',
          text: `Net mission profit: +\$${payout.netM.toFixed(1)} M (gross \$${payout.grossRewardM.toFixed(1)} M − costs \$${(payout.buildCostM + payout.launchCostM + payout.repairCostM).toFixed(1)} M).`,
        });
      } else {
        causes.push({
          severity: 'warning',
          text: `Mission ran at a net loss of \$${Math.abs(payout.netM).toFixed(1)} M (gross reward \$${payout.grossRewardM.toFixed(1)} M was outweighed by build/launch/repair costs).`,
        });
        suggestions.push('Trim excess fuel or downscale non-essential components to cut build cost.');
      }

      // -------------------------------------------------------------------------
      // 5. Headline refinement for data/scavenge partial success
      // -------------------------------------------------------------------------
      if (
        headline.startsWith('Soft landing') &&
        scavenge !== null &&
        scavenge.dataSentMB < scavenge.dataGeneratedMB - 0.1
      ) {
        headline = 'Soft landing, science data partly lost';
      }
      if (flight.outcome === 'abort') {
        headline = 'Mission aborted';
        if (!causes.some((c) => c.severity === 'critical')) {
          causes.push({
            severity: 'critical',
            text: 'Flight was aborted due to system depletion or premature termination sequence.',
          });
          suggestions.push('Review power balance and ensure batteries cover all eclipse phases.');
        }
      }

      // -------------------------------------------------------------------------
      // 6. NASA analogue (may be null — no reference when none fits)
      // -------------------------------------------------------------------------
      const ref = nasaRef(nasaTag);
      const similarRealMission = ref ? `${ref.mission} — ${ref.note}` : undefined;

      // -------------------------------------------------------------------------
      // 7. Timeline: merge and sort by tS ascending
      // -------------------------------------------------------------------------
      const rawTimeline: MissionEvent[] = [
        ...flight.events,
        ...(scavenge?.events ?? []),
      ];
      const timeline = rawTimeline
        .slice()
        .sort((a, b) => a.tS - b.tS)
        .map((ev) => ({ ...ev, text: `${formatT(ev.tS)} — ${ev.text}` }));

      return {
        headline,
        outcome: flight.outcome,
        causes,
        suggestions,
        timeline,
        similarRealMission,
      };
    }
