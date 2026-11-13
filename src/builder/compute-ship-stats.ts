import type { Body, PartDef, ShipDesign, ShipStats } from '@/types';
import { G0_MS2 } from '@/config/constants';

/**
 * Compute all derived ShipStats from a design, the part catalog and the target body.
 * This is the heart of the builder — every stat shown in the UI comes from here.
 * See concept file section 4 (Builder: components and tunable parameters).
 * TODO(owner-2): implement real computation:
 *   - Apply param values (thrustScale, ispScale, volume, etc.) to base stats
 *   - Rocket equation: Δv = Isp × g0 × ln(m_wet / m_dry)
 *   - Power balance: sum(basePowerW × paramScales) for all parts
 *   - Data balance: sum instrument dataRates vs antenna downlinkKbps
 *   - Reliability: product of (condition/100) for critical parts
 *   - controlAuthority: from RCS count + gimbal + computer assistLevel
 *   - violations: check mass/budget/power against contract limits
 *
 * STUB: returns plausible values based on part count and body gravity.
 */
export function computeShipStats(
  design: ShipDesign,
  catalog: PartDef[],
  body: Body
): ShipStats {
  const catalogMap = new Map(catalog.map((p) => [p.id, p]));

  let totalMassKg = 0;
  let fuelMassKg = 0;
  let costM = 0;
  let powerGenW = 0;
  let powerDrawW = 0;
  let batteryWh = 0;
  let dataGenKbps = 0;
  let downlinkKbps = 0;
  let thrustN = 0;
  let ispS = 282;
  let reliabilityProduct = 1;
  let controlSum = 0;
  const warnings: string[] = [];
  const violations: string[] = [];

  for (const inst of design.parts) {
    const def = catalogMap.get(inst.partId);
    if (!def) {
      warnings.push(`Unknown part: ${inst.partId}`);
      continue;
    }

    const thrustScaleParam = inst.paramValues['thrustScale'] ?? 1;
    const ispScaleParam = inst.paramValues['ispScale'] ?? 1;
    const volumeParam = inst.paramValues['volume'] ?? 1;
    const countParam = inst.paramValues['count'] ?? 1;
    const areaParam = inst.paramValues['area'] ?? 1;
    const capacityParam = inst.paramValues['capacity'] ?? 1;
    const sizeParam = inst.paramValues['size'] ?? 1;

    totalMassKg += def.baseMassKg * countParam;
    costM += def.baseCostM * countParam;

    if (def.stats.fuelCapacityKg) {
      const fMass = def.stats.fuelCapacityKg * volumeParam;
      fuelMassKg += fMass;
      totalMassKg += fMass;
    }
    if (def.basePowerW > 0) powerDrawW += def.basePowerW * countParam;
    if (def.basePowerW < 0) powerGenW += Math.abs(def.basePowerW) * areaParam;
    if (def.stats.batteryWh) batteryWh += def.stats.batteryWh * capacityParam;
    if (def.stats.downlinkKbps) downlinkKbps += def.stats.downlinkKbps * sizeParam;
    if (def.stats.dataRateKbps) dataGenKbps += def.stats.dataRateKbps;
    if (def.stats.thrustN) {
      thrustN += def.stats.thrustN * thrustScaleParam * countParam;
      if (def.stats.ispS) ispS = def.stats.ispS * ispScaleParam;
    }
    if (def.stats.assistLevel) controlSum += def.stats.assistLevel;
    if (def.stats.rcsThrustN) controlSum += 0.5;

    reliabilityProduct *= (inst.condition / 100);
  }

  const dryMassKg = totalMassKg - fuelMassKg;

  // Rocket equation: Δv = Isp × g0 × ln(wet/dry)
  const deltaVms = fuelMassKg > 0 && dryMassKg > 0
    ? ispS * G0_MS2 * Math.log((dryMassKg + fuelMassKg) / dryMassKg)
    : 0;

  const twr = thrustN > 0 && totalMassKg > 0 && body.gravityMs2 > 0
    ? thrustN / (totalMassKg * body.gravityMs2)
    : 0;

  if (twr < 1.1) warnings.push('TWR below 1.1 — may not be able to hover for landing');
  if (deltaVms < 500) warnings.push('Low Δv — may run out of fuel');
  if (powerDrawW > powerGenW + batteryWh / 24) warnings.push('Power deficit — instruments may shut down');
  if (dataGenKbps > downlinkKbps) warnings.push('Data generation exceeds downlink — science data may be lost');

  const dataBufferMB = 500;

  return {
    totalMassKg,
    dryMassKg,
    fuelMassKg,
    deltaVms,
    thrustN,
    twr,
    powerGenW,
    powerDrawW,
    batteryWh,
    dataGenKbps,
    downlinkKbps,
    dataBufferMB,
    costM,
    reliability: Math.pow(reliabilityProduct, 1 / Math.max(1, design.parts.length)),
    controlAuthority: Math.min(1, controlSum / 3),
    touchdownLimits: {
      maxVyMs: 6,
      maxVxMs: 3,
      maxTiltDeg: 15,
    },
    warnings,
    valid: violations.length === 0,
    violations,
  };
}

