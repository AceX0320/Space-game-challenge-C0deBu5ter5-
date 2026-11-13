import type { Body, Contract, Difficulty, FlightResult, ItemDef, ScavengeResult, ShipStats } from '@/types';
import { createRng } from '@/core/rng';
import { clamp } from '@/core/units';

/**
 * Simulate the automatic scavenging phase after landing.
 * See concept file section 10A (Scavenging and research).
 * TODO(owner-3): integrate real part-failure events from Hard mode malfunctions.
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
  const timeAvailableS = body.baseLifetimeS * powerFactor * landingFactor;

  if (timeAvailableS <= 0 || flight.outcome === 'crash') {
    return {
      itemsFound: [],
      dataGeneratedMB: 0,
      dataSentMB: 0,
      timeUsedS: 0,
      timeAvailableS: 0,
      endedBy: 'part-failure',
      events: [{ tS: 0, kind: 'failure', text: 'Ship was destroyed on impact — no scavenging possible.' }],
    };
  }

  // Filter items available on this body and with compatible instruments
  const availableItems = items.filter((item) => item.bodyIds.includes(body.id));

  const itemsFound = [];
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
      break;
    }

    // Probability of finding this item this mission
    const findProb = 0.6 + flight.landingRing / 10 - (difficulty === 'hard' ? 0.1 : 0);
    if (rng() < findProb) {
      const quantity = Math.ceil(rng() * 3);
      const tS = currentTimeS + rng() * (timeAvailableS / Math.max(1, availableItems.length));
      itemsFound.push({ itemId: item.id, tS, quantity, transmitted: true });
      dataGeneratedMB += item.dataMB * quantity;
      currentTimeS = tS;
    }
  }

  const dataSentMB = Math.min(dataGeneratedMB, stats.downlinkKbps * (timeAvailableS / 1000) * 8);

  return {
    itemsFound,
    dataGeneratedMB,
    dataSentMB,
    timeUsedS: currentTimeS,
    timeAvailableS,
    endedBy,
    events: [],
  };
}
