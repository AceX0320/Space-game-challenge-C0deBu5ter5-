import type { Contract, ShipDesign, ShipStats } from '@/types';

/**
 * Validate a ship design against a contract's constraints.
 * Returns a list of violation strings (empty = valid).
 * See concept file section 4 and 5 (trade-offs and builder constraints).
 * TODO(owner-2): implement full validation including required instruments check.
 */
export function validateDesign(
  design: ShipDesign,
  stats: ShipStats,
  contract: Contract
): string[] {
  const violations: string[] = [];

  if (stats.costM > contract.budgetCapM) {
    violations.push(`Build cost $${stats.costM.toFixed(1)}M exceeds budget cap $${contract.budgetCapM}M`);
  }
  if (stats.twr < 1.0) {
    violations.push(`Thrust-to-weight ratio ${stats.twr.toFixed(2)} is below 1.0 — cannot land on ${contract.bodyId}`);
  }
  if (stats.deltaVms < 200) {
    violations.push('Insufficient Δv — not enough fuel to complete the mission');
  }
  if (design.parts.length === 0) {
    violations.push('Ship has no parts');
  }

  // Check required instruments
  for (const required of contract.requiredInstruments) {
    // TODO(owner-2): check that the design contains the required instrument
    void required;
  }

  return violations;
}

