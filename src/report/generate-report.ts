import type { Contract, MissionReport, MissionResult, PayoutResult, ReportItem, ShipStats } from '@/types';

/**
 * Generate a comprehensive post-mission report explaining why the mission succeeded or failed.
 * See concept file section 12 (Education layer and post-mission report).
 * TODO(owner-6): expand real NASA mission matching and deeper root-cause telemetry analysis.
 */
export function generateReport(
  contract: Contract,
  stats: ShipStats,
  result: MissionResult,
  payout: PayoutResult
): MissionReport {
  const { flight, scavenge } = result;
  const causes: ReportItem[] = [];
  const suggestions: string[] = [];

  let headline = '';
  switch (flight.outcome) {
    case 'soft':
      headline = `Mission Successful: Pristine touchdown on ${contract.bodyId}`;
      causes.push({
        severity: 'good',
        text: `Touchdown speed (${Math.abs(flight.touchdownVyMs).toFixed(1)} m/s) was well within the ${stats.touchdownLimits.maxVyMs} m/s leg limit.`,
      });
      break;
    case 'rough':
      headline = `Hard Landing: Spacecraft sustained damage on touchdown`;
      causes.push({
        severity: 'warning',
        text: `Touchdown speed or tilt pushed landing gear near its mechanical threshold.`,
      });
      suggestions.push('Consider upgrading to wide-stance landing legs or reducing descent rate with higher thrust.');
      break;
    case 'crash':
      headline = `Mission Failure: Spacecraft destroyed on impact`;
      causes.push({
        severity: 'critical',
        text: `Vertical speed ${Math.abs(flight.touchdownVyMs).toFixed(1)} m/s exceeded leg structural limit of ${stats.touchdownLimits.maxVyMs} m/s. Thrust-to-weight (${stats.twr.toFixed(2)}) was insufficient to decelerate.`,
      });
      suggestions.push('Increase engine count, add more propellant, or widen throttle margin for terminal descent.');
      break;
    case 'abort':
      headline = `Mission Aborted: Critical failure during transit or descent`;
      causes.push({
        severity: 'critical',
        text: 'Flight aborted due to system depletion or premature termination.',
      });
      suggestions.push('Review power balance and ensure batteries cover eclipse phases.');
      break;
  }

  if (scavenge) {
    if (scavenge.endedBy === 'data-full') {
      causes.push({
        severity: 'warning',
        text: 'Data buffer filled up before mission end. Some science data could not be recorded.',
      });
      suggestions.push('Equip a high-gain dish antenna or upgrade data buffer storage.');
    } else if (scavenge.endedBy === 'power') {
      causes.push({
        severity: 'warning',
        text: 'Power was exhausted on the surface, curtailing scientific observations.',
      });
      suggestions.push('Add larger solar arrays or a battery pack with higher Wh capacity.');
    } else {
      causes.push({
        severity: 'good',
        text: `Downlinked ${scavenge.dataSentMB.toFixed(1)} MB of scientific findings back to mission control.`,
      });
    }
  }

  // Financial summary
  if (payout.netM >= 0) {
    causes.push({
      severity: 'good',
      text: `Net mission profit: +$${payout.netM.toFixed(1)}M.`,
    });
  } else {
    causes.push({
      severity: 'warning',
      text: `Mission operated at a net loss of $${Math.abs(payout.netM).toFixed(1)}M due to heavy build/launch costs.`,
    });
    suggestions.push('Trim excess fuel or downscale non-essential components to meet budget margins.');
  }

  // Real NASA mission comparisons
  const missionMap: Record<string, string> = {
    moon: 'Surveyor 1 (1966) — NASA’s first soft landing on the Moon, verifying surface bearing strength.',
    mars: 'Viking 1 (1976) — NASA’s historic first successful soft landing and science operations on Mars.',
    titan: 'Huygens Probe (ESA/NASA Cassini, 2005) — First touchdown in the outer Solar System.',
    venus: 'Pioneer Venus Multiprobe (1978) — Atmospheric probes surviving extreme pressure and heat.',
    asteroid: 'OSIRIS-REx (2020) — Precision touch-and-go sampling on asteroid Bennu.',
  };

  const similarRealMission = missionMap[contract.bodyId] ?? 'Apollo 11 Lunar Module (1969)';

  const timeline = [...flight.events, ...(scavenge?.events ?? [])];

  return {
    headline,
    outcome: flight.outcome,
    causes,
    suggestions,
    timeline,
    similarRealMission,
  };
}
