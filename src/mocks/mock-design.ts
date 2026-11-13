import type { ShipDesign } from '@/types';

export const mockDesign: ShipDesign = {
  id: 'design-apollo-style',
  name: 'Odyssey I',
  contractId: 'first-light',
  parts: [
    {
      instanceId: 'hull-1',
      partId: 'hull-standard',
      paramValues: { size: 1, material: 1 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'engine-1',
      partId: 'engine-merlin-class',
      paramValues: { count: 1, thrustScale: 1.0, ispScale: 1.0, gimbalDeg: 5 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'tank-1',
      partId: 'tank-standard',
      paramValues: { volume: 1.5, pressurised: 1 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'rcs-1',
      partId: 'rcs-standard',
      paramValues: { count: 4, strength: 1.0 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'leg-1',
      partId: 'leg-standard',
      paramValues: { count: 4, length: 1.0, footpadWidth: 1.0, shockAbsorption: 1.0 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'power-solar-1',
      partId: 'power-solar',
      paramValues: { area: 1.5, efficiency: 1.0 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'power-battery-1',
      partId: 'power-battery',
      paramValues: { capacity: 1.0, cells: 1 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'comms-1',
      partId: 'comms-low-gain',
      paramValues: { size: 1.0 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'computer-1',
      partId: 'computer-basic',
      paramValues: { tier: 1 },
      condition: 100,
      maxCondition: 100,
    },
    {
      instanceId: 'instrument-camera-1',
      partId: 'instrument-camera',
      paramValues: { resolution: 1.0 },
      condition: 100,
      maxCondition: 100,
    },
  ],
};

