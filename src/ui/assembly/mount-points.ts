import type { PartCategory, PartDef, PartInstance } from '@/types';

export type FacingDirection = 'top' | 'bottom' | 'left' | 'right';

export interface MountPointDef {
  id: string;
  name: string;
  relX: number; // relative offset X in px
  relY: number; // relative offset Y in px
  facing: FacingDirection;
  allowedCategories: PartCategory[];
  isRadial?: boolean;
}

export interface PartMountProfile {
  partCategory: PartCategory;
  /** Primary mounting point of this part itself (where it attaches) */
  attachPoint: { relX: number; relY: number; facing: FacingDirection };
  /** Available docking/mounting points this part provides for child components (1-2 axial + optional radial ring) */
  childMountPoints: MountPointDef[];
}

/**
 * Mounting point definitions per part category.
 * Complies with the 1-2 primary axial mounting points specification,
 * with structural parts (hull, tank) exposing a dual radial ring (left/right)
 * for mirrored accessories (legs, solar, RCS, instruments).
 */
export const MOUNT_PROFILES: Record<PartCategory, PartMountProfile> = {
  hull: {
    partCategory: 'hull',
    attachPoint: { relX: 0, relY: 0, facing: 'bottom' },
    childMountPoints: [
      {
        id: 'top',
        name: 'Avionics Top Port',
        relX: 0,
        relY: -55,
        facing: 'top',
        allowedCategories: ['parachute', 'comms', 'instrument', 'computer'],
      },
      {
        id: 'bottom',
        name: 'Lower Interstage Deck',
        relX: 0,
        relY: 45,
        facing: 'bottom',
        allowedCategories: ['tank', 'engine', 'heatshield'],
      },
      {
        id: 'radial-left',
        name: 'Port Radial Bay',
        relX: -45,
        relY: -5,
        facing: 'left',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer', 'leg'],
        isRadial: true,
      },
      {
        id: 'radial-right',
        name: 'Starboard Radial Bay',
        relX: 45,
        relY: -5,
        facing: 'right',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer', 'leg'],
        isRadial: true,
      },
      {
        id: 'top-port',
        name: 'Top Port Standoff',
        relX: -20,
        relY: -50,
        facing: 'top',
        allowedCategories: ['instrument', 'comms', 'computer'],
      },
      {
        id: 'top-stbd',
        name: 'Top Starboard Standoff',
        relX: 20,
        relY: -50,
        facing: 'top',
        allowedCategories: ['instrument', 'comms', 'computer'],
      },
    ],
  },
  tank: {
    partCategory: 'tank',
    attachPoint: { relX: 0, relY: -45, facing: 'top' },
    childMountPoints: [
      {
        id: 'top',
        name: 'Upper Tank Dome',
        relX: 0,
        relY: -45,
        facing: 'top',
        allowedCategories: ['hull', 'tank', 'parachute'],
      },
      {
        id: 'bottom',
        name: 'Center Thrust Mount',
        relX: 0,
        relY: 45,
        facing: 'bottom',
        allowedCategories: ['engine', 'tank', 'heatshield'],
      },
      {
        id: 'engine-port',
        name: 'Port Thrust Mount',
        relX: -25,
        relY: 45,
        facing: 'bottom',
        allowedCategories: ['engine', 'rcs'],
      },
      {
        id: 'engine-stbd',
        name: 'Starboard Thrust Mount',
        relX: 25,
        relY: 45,
        facing: 'bottom',
        allowedCategories: ['engine', 'rcs'],
      },
      {
        id: 'radial-left',
        name: 'Port Outrigger Bay',
        relX: -50,
        relY: 20,
        facing: 'left',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
      {
        id: 'radial-right',
        name: 'Starboard Outrigger Bay',
        relX: 50,
        relY: 20,
        facing: 'right',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
      {
        id: 'radial-left-upper',
        name: 'Upper Port Bay',
        relX: -45,
        relY: -15,
        facing: 'left',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
      {
        id: 'radial-right-upper',
        name: 'Upper Starboard Bay',
        relX: 45,
        relY: -15,
        facing: 'right',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
    ],
  },
  engine: {
    partCategory: 'engine',
    attachPoint: { relX: 0, relY: -20, facing: 'top' },
    childMountPoints: [], // Engines do not provide child mounts
  },
  leg: {
    partCategory: 'leg',
    attachPoint: { relX: 0, relY: 0, facing: 'left' },
    childMountPoints: [],
  },
  power: {
    partCategory: 'power',
    attachPoint: { relX: 0, relY: 0, facing: 'left' },
    childMountPoints: [],
  },
  comms: {
    partCategory: 'comms',
    attachPoint: { relX: 0, relY: 15, facing: 'bottom' },
    childMountPoints: [],
  },
  computer: {
    partCategory: 'computer',
    attachPoint: { relX: 0, relY: 0, facing: 'left' },
    childMountPoints: [],
  },
  instrument: {
    partCategory: 'instrument',
    attachPoint: { relX: 0, relY: 10, facing: 'bottom' },
    childMountPoints: [],
  },
  heatshield: {
    partCategory: 'heatshield',
    attachPoint: { relX: 0, relY: -10, facing: 'top' },
    childMountPoints: [],
  },
  parachute: {
    partCategory: 'parachute',
    attachPoint: { relX: 0, relY: 15, facing: 'bottom' },
    childMountPoints: [],
  },
  rcs: {
    partCategory: 'rcs',
    attachPoint: { relX: 0, relY: 0, facing: 'left' },
    childMountPoints: [],
  },
};

const LOCAL_STORAGE_KEY = 'launchsmith.ui.mounts';

export interface PartPlacement {
  instanceId: string;
  partId: string;
  category: PartCategory;
  parentInstanceId: string | null;
  mountPointId: string | null;
  canvasX: number;
  canvasY: number;
}

/**
 * Loads UI-only mount assignments from localStorage.
 */
export function loadMountMap(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves UI-only mount assignments to localStorage.
 */
export function saveMountMap(map: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Auto-resolves layout for the entire spacecraft from design.parts.
 * If UI map is missing or stale, sequentially places parts into free compatible slots.
 */
export function resolveAssemblyLayout(
  parts: PartInstance[],
  catalog: PartDef[],
  originX = 180,
  originY = 180
): {
  placements: PartPlacement[];
  unmounted: PartInstance[];
  availableSlots: Array<{
    parentInstanceId: string;
    mountPointId: string;
    canvasX: number;
    canvasY: number;
    facing: FacingDirection;
    allowedCategories: PartCategory[];
  }>;
} {
  const mountMap = loadMountMap();
  const placements: PartPlacement[] = [];
  const unmounted: PartInstance[] = [];

  // Find root part: preferably a hull, or the first tank, or first part
  let rootInstance = parts.find((p) => {
    const def = catalog.find((d) => d.id === p.partId);
    return def?.category === 'hull';
  });
  if (!rootInstance) {
    rootInstance = parts.find((p) => {
      const def = catalog.find((d) => d.id === p.partId);
      return def?.category === 'tank';
    });
  }
  if (!rootInstance && parts.length > 0) {
    rootInstance = parts[0];
  }

  const occupiedSlots = new Set<string>(); // "parentInstanceId:mountPointId"

  if (rootInstance) {
    const rootDef = catalog.find((d) => d.id === rootInstance!.partId);
    placements.push({
      instanceId: rootInstance.instanceId,
      partId: rootInstance.partId,
      category: rootDef?.category ?? 'hull',
      parentInstanceId: null,
      mountPointId: null,
      canvasX: originX,
      canvasY: originY,
    });
  }

  const categoryPriority: Record<PartCategory, number> = {
    hull: 1,
    tank: 2,
    heatshield: 3,
    engine: 4,
    parachute: 5,
    power: 6,
    rcs: 7,
    leg: 8,
    comms: 9,
    computer: 10,
    instrument: 11,
  };

  const remainingParts = parts
    .filter((p) => !rootInstance || p.instanceId !== rootInstance.instanceId)
    .sort((a, b) => {
      const defA = catalog.find((d) => d.id === a.partId);
      const defB = catalog.find((d) => d.id === b.partId);
      const prioA = defA ? categoryPriority[defA.category] ?? 99 : 99;
      const prioB = defB ? categoryPriority[defB.category] ?? 99 : 99;
      return prioA - prioB;
    });

  // Iterate over remaining parts and place them onto available mounts
  for (const part of remainingParts) {

    const def = catalog.find((d) => d.id === part.partId);
    if (!def) continue;

    const cat = def.category;
    let placed = false;

    // 1. Try recorded placement in mountMap
    const savedMountKey = mountMap[part.instanceId];
    if (savedMountKey && !occupiedSlots.has(savedMountKey)) {
      const [parentInstId, mId] = savedMountKey.split(':');
      const parentPlacement = placements.find((p) => p.instanceId === parentInstId);
      if (parentPlacement) {
        const parentProfile = MOUNT_PROFILES[parentPlacement.category];
        const slot = parentProfile.childMountPoints.find((m) => m.id === mId);
        if (slot && slot.allowedCategories.includes(cat)) {
          occupiedSlots.add(savedMountKey);
          placements.push({
            instanceId: part.instanceId,
            partId: part.partId,
            category: cat,
            parentInstanceId: parentInstId!,
            mountPointId: mId!,
            canvasX: parentPlacement.canvasX + slot.relX,
            canvasY: parentPlacement.canvasY + slot.relY,
          });
          placed = true;
        }
      }
    }

    // 2. If not placed, auto-assign to first free compatible mounting point
    if (!placed) {
      for (const parentPlacement of placements) {
        const parentProfile = MOUNT_PROFILES[parentPlacement.category];
        for (const slot of parentProfile.childMountPoints) {
          const slotKey = `${parentPlacement.instanceId}:${slot.id}`;
          if (!occupiedSlots.has(slotKey) && slot.allowedCategories.includes(cat)) {
            occupiedSlots.add(slotKey);
            mountMap[part.instanceId] = slotKey;
            placements.push({
              instanceId: part.instanceId,
              partId: part.partId,
              category: cat,
              parentInstanceId: parentPlacement.instanceId,
              mountPointId: slot.id,
              canvasX: parentPlacement.canvasX + slot.relX,
              canvasY: parentPlacement.canvasY + slot.relY,
            });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    if (!placed) {
      unmounted.push(part);
    }
  }

  saveMountMap(mountMap);

  // Compute all remaining available slots on canvas for drag-drop highlights
  const availableSlots: Array<{
    parentInstanceId: string;
    mountPointId: string;
    canvasX: number;
    canvasY: number;
    facing: FacingDirection;
    allowedCategories: PartCategory[];
  }> = [];

  for (const parent of placements) {
    const profile = MOUNT_PROFILES[parent.category];
    for (const slot of profile.childMountPoints) {
      const slotKey = `${parent.instanceId}:${slot.id}`;
      if (!occupiedSlots.has(slotKey)) {
        availableSlots.push({
          parentInstanceId: parent.instanceId,
          mountPointId: slot.id,
          canvasX: parent.canvasX + slot.relX,
          canvasY: parent.canvasY + slot.relY,
          facing: slot.facing,
          allowedCategories: slot.allowedCategories,
        });
      }
    }
  }

  return { placements, unmounted, availableSlots };
}
