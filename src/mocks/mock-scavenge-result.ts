import type { ScavengeResult } from '@/types';

export const mockScavengeResult: ScavengeResult = {
  itemsFound: [
    { itemId: 'regolith-sample', tS: 120, quantity: 2, transmitted: true },
    { itemId: 'water-ice', tS: 450, quantity: 1, transmitted: true },
  ],
  dataGeneratedMB: 20.0,
  dataSentMB: 20.0,
  timeUsedS: 1800,
  timeAvailableS: 86400,
  endedBy: 'timer',
  events: [
    { tS: 120, kind: 'milestone', text: 'Drill extracted high-density regolith sample.' },
    { tS: 450, kind: 'milestone', text: 'Spectrometer detected trace water ice in polar shadow.' },
    { tS: 800, kind: 'info', text: 'Downlinked 20 MB of compressed telemetry and imagery.' },
  ],
};

