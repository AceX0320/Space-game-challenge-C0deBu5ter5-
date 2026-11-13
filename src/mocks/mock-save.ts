import type { SaveGame } from '@/types';
import { mockDesign } from './mock-design';

export const mockSave: SaveGame = {
  version: 1,
  fundsM: 75.0,
  difficulty: 'normal',
  unlockedContractIds: ['first-light', 'eyes-on-mars'],
  completedContracts: {
    'first-light': {
      bestNetM: 28.5,
      bestScore: 92,
      plays: 1,
    },
  },
  streaks: {
    cleanAscent: 1,
    smoothHands: 1,
    pinpoint: 1,
    softTouch: 1,
    frugal: 0,
  },
  safetyNets: 1,
  inventory: [
    { itemId: 'regolith-sample', quantity: 4 },
    { itemId: 'water-ice', quantity: 1 },
  ],
  researched: ['materials-alloys'],
  ownedParts: mockDesign.parts,
  currentDesign: mockDesign,
};

