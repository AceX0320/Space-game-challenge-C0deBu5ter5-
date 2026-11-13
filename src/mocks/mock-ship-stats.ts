import type { ShipStats } from '@/types';

export const mockShipStats: ShipStats = {
  totalMassKg: 4200,
  dryMassKg: 1200,
  fuelMassKg: 3000,
  deltaVms: 3450,
  thrustN: 450000,
  twr: 6.6, // on Moon
  powerGenW: 600,
  powerDrawW: 320,
  batteryWh: 500,
  dataGenKbps: 50,
  downlinkKbps: 80,
  dataBufferMB: 500,
  costM: 28.5,
  reliability: 1.0,
  controlAuthority: 0.85,
  touchdownLimits: {
    maxVyMs: 6.0,
    maxVxMs: 3.0,
    maxTiltDeg: 15.0,
  },
  warnings: [],
  valid: true,
  violations: [],
};
