import type { MissionResult } from '@/types';
import { mockFlightResult } from './mock-flight-result';
import { mockScavengeResult } from './mock-scavenge-result';

export const mockMissionResult: MissionResult = {
  contractId: 'first-light',
  difficulty: 'normal',
  flight: mockFlightResult,
  scavenge: mockScavengeResult,
  partWearDelta: {
    'engine-1': 8.0,
    'leg-1': 6.0,
    'tank-1': 2.0,
  },
  malfunctions: [],
};

