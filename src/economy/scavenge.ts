import type {
  Body,
  Contract,
  Difficulty,
  FlightResult,
  FoundItem,
  ItemDef,
  MissionEvent,
  ScavengeResult,
  ShipStats,
} from '@/types';
import { createRng } from '@/core/rng';
import { clamp, round } from '@/core/units';

/**
 * Simulate the automatic scavenging phase after landing.
 * See concept file section 10A (Scavenging and research).
 */
export function simulateScavenge(
  stats: ShipStats,
  body: Body,
  _contract: Contract,
  flight: FlightResult,
  items: ItemDef[],
  difficulty: Difficulty,
  seed: number
): ScavengeResult {
  const rng = createRng(seed);

  // Mission lifetime: base lifetime modified by power surplus and landing quality
  const powerSurplus = stats.powerGenW - stats.powerDrawW;
  const powerFactor = clamp(0.5 + powerSurplus / 1000, 0.3, 2.0);
  const landingFactor = flight.outcome === 'soft' ? 1.0 : flight.outcome === 'rough' ? 0.6 : 0;
  const timeAvailableS = round(body.baseLifetimeS * powerFactor * landingFactor, 2);

  if (timeAvailableS <= 0 || flight.outcome === 'crash' || flight.outcome === 'abort') {
    return {
      itemsFound: [],
      dataGeneratedMB: 0,
      dataSentMB: 0,
      timeUsedS: 0,
      timeAvailableS: 0,
      endedBy: 'part-failure',
      events: [
        {
          tS: 0,
          kind: 'failure',
          text: 'Ship did not achieve a functional surface landing — no scavenging possible.',
        },
      ],
    };
  }

  // Filter items available on this body
  const availableItems = items.filter((item) => item.bodyIds.includes(body.id));

  const itemsFound: FoundItem[] = [];
  const events: MissionEvent[] = [];
  let dataGeneratedMB = 0;
  let currentTimeS = 0;
  let endedBy: ScavengeResult['endedBy'] = 'timer';

  for (const item of availableItems) {
    if (currentTimeS >= timeAvailableS) {
      endedBy = 'timer';
      break;
    }
    if (dataGeneratedMB >= stats.dataBufferMB) {
      endedBy = 'data-full';
      events.push({
        tS: round(currentTimeS, 1),
        kind: 'warning',
        text: 'Onboard data buffer reached capacity — surface sampling halted.',
      });
      break;
    }

    // Hard mode reliability check: worn/low-reliability ships risk early part malfunction
    if (difficulty === 'hard' && stats.reliability < 0.85) {
      const failureProb = clamp(0.9 - stats.reliability, 0.1, 0.6);
      if (rng() < failureProb) {
        endedBy = 'part-failure';
        events.push({
          tS: round(currentTimeS, 1),
          kind: 'malfunction',
          text: 'Surface instrument malfunctioned under harsh environmental stress.',
        });
        break;
      }
    }

    // Negative power balance check: battery depletion can end surface operations early
    if (powerSurplus < 0 && currentTimeS > timeAvailableS * 0.4 && rng() < 0.5) {
      endedBy = 'power';
      events.push({
        tS: round(currentTimeS, 1),
        kind: 'warning',
        text: 'Battery reserves depleted due to negative surface power balance.',
      });
      break;
    }

    // Probability of finding this item this mission
    const findProb = 0.6 + flight.landingRing / 10 - (difficulty === 'hard' ? 0.1 : 0);
    if (rng() < findProb) {
      const quantity = Math.ceil(rng() * 3);
      const tS = round(
        currentTimeS + rng() * (timeAvailableS / Math.max(1, availableItems.length)),
        1
      );
      itemsFound.push({ itemId: item.id, tS, quantity, transmitted: true });
      dataGeneratedMB = round(dataGeneratedMB + item.dataMB * quantity, 2);
      currentTimeS = tS;
    }
  }

  const maxTransmittedMB = stats.downlinkKbps * (timeAvailableS / 1000) * 8;
  const dataSentMB = round(Math.min(dataGeneratedMB, maxTransmittedMB), 2);

  return {
    itemsFound,
    dataGeneratedMB,
    dataSentMB,
    timeUsedS: round(currentTimeS, 1),
    timeAvailableS,
    endedBy,
    events,
  };
}
