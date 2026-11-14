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
  /** Available docking/mounting points this part provides for child components */
  childMountPoints: MountPointDef[];
}

/**
 * Standard named mounting slots per Round 3 specification:
 * Every host part (bus, tank) exposes:
 * - top
 * - bottom
 * - upper-left
 * - upper-right
 * - lower-left
 * - lower-right
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
        name: 'Lower Thrust & Interstage',
        relX: 0,
        relY: 45,
        facing: 'bottom',
        allowedCategories: ['tank', 'engine', 'heatshield'],
      },
      {
        id: 'upper-left',
        name: 'Upper Port Equipment Bay',
        relX: -45,
        relY: -15,
        facing: 'left',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
        isRadial: true,
      },
      {
        id: 'upper-right',
        name: 'Upper Starboard Equipment Bay',
        relX: 45,
        relY: -15,
        facing: 'right',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
        isRadial: true,
      },
      {
        id: 'lower-left',
        name: 'Lower Port Landing Bay',
        relX: -50,
        relY: 25,
        facing: 'left',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
      {
        id: 'lower-right',
        name: 'Lower Starboard Landing Bay',
        relX: 50,
        relY: 25,
        facing: 'right',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
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
        name: 'Primary Thrust Structure',
        relX: 0,
        relY: 55,
        facing: 'bottom',
        allowedCategories: ['engine', 'tank', 'heatshield'],
      },
      // Engine cluster expansion mounts (sharing bottom thrust structure up to 4 engines)
      {
        id: 'bottom-2',
        name: 'Port Engine Cluster Mount',
        relX: -26,
        relY: 55,
        facing: 'bottom',
        allowedCategories: ['engine'],
      },
      {
        id: 'bottom-3',
        name: 'Starboard Engine Cluster Mount',
        relX: 26,
        relY: 55,
        facing: 'bottom',
        allowedCategories: ['engine'],
      },
      {
        id: 'bottom-4',
        name: 'Aft Engine Center Cluster Mount',
        relX: 0,
        relY: 65,
        facing: 'bottom',
        allowedCategories: ['engine'],
      },
      {
        id: 'upper-left',
        name: 'Upper Port Equipment Bay',
        relX: -45,
        relY: -15,
        facing: 'left',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
        isRadial: true,
      },
      {
        id: 'upper-right',
        name: 'Upper Starboard Equipment Bay',
        relX: 45,
        relY: -15,
        facing: 'right',
        allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
        isRadial: true,
      },
      {
        id: 'lower-left',
        name: 'Lower Port Landing Outrigger',
        relX: -55,
        relY: 30,
        facing: 'left',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
      {
        id: 'lower-right',
        name: 'Lower Starboard Landing Outrigger',
        relX: 55,
        relY: 30,
        facing: 'right',
        allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'],
        isRadial: true,
      },
    ],
  },
  engine: {
    partCategory: 'engine',
    attachPoint: { relX: 0, relY: -20, facing: 'top' },
    childMountPoints: [],
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

export interface MountSlotInfo {
  parentInstanceId: string;
  mountPointId: string;
  name: string;
  canvasX: number;
  canvasY: number;
  facing: FacingDirection;
  allowedCategories: PartCategory[];
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
 * Prioritizes structural stacking (hull -> tank -> attachments), enforces
 * named slots, and supports mirrored legs and engine clusters.
 */
export function resolveAssemblyLayout(
  parts: PartInstance[],
  catalog: PartDef[],
  originX = 200,
  originY = 200
): {
  placements: PartPlacement[];
  unmounted: PartInstance[];
  availableSlots: MountSlotInfo[];
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

  // Placement priority: structural stack parts first, then power/avionics, then engines & legs
  const categoryPriority: Record<PartCategory, number> = {
    hull: 1,
    tank: 2,
    heatshield: 3,
    comms: 4,
    parachute: 5,
    power: 6,
    computer: 7,
    instrument: 8,
    rcs: 9,
    engine: 10,
    leg: 11,
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

  // Slot preference order by category
  const preferredSlotOrder = (category: PartCategory): string[] => {
    switch (category) {
      case 'leg':
        return ['lower-left', 'lower-right', 'radial-left', 'radial-right'];
      case 'engine':
        return ['bottom', 'bottom-2', 'bottom-3', 'bottom-4', 'engine-port', 'engine-stbd'];
      case 'comms':
        return ['top', 'upper-left', 'upper-right'];
      case 'parachute':
        return ['top', 'upper-left', 'upper-right'];
      case 'power':
      case 'rcs':
      case 'instrument':
      case 'computer':
        return ['upper-left', 'upper-right', 'lower-left', 'lower-right', 'top'];
      case 'tank':
      case 'heatshield':
        return ['bottom', 'top'];
      default:
        return ['bottom', 'top', 'upper-left', 'upper-right', 'lower-left', 'lower-right'];
    }
  };

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

    // 2. If not placed, auto-assign following preferred slot order
    if (!placed) {
      const prefs = preferredSlotOrder(cat);
      for (const parentPlacement of placements) {
        const parentProfile = MOUNT_PROFILES[parentPlacement.category];
        // Sort candidate child slots by preference
        const sortedSlots = [...parentProfile.childMountPoints].sort((sA, sB) => {
          const idxA = prefs.indexOf(sA.id);
          const idxB = prefs.indexOf(sB.id);
          const valA = idxA === -1 ? 999 : idxA;
          const valB = idxB === -1 ? 999 : idxB;
          return valA - valB;
        });

        for (const slot of sortedSlots) {
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

  // Compute all remaining available slots on canvas for drag-drop and hover highlights
  const availableSlots: MountSlotInfo[] = [];

  for (const parent of placements) {
    const profile = MOUNT_PROFILES[parent.category];
    for (const slot of profile.childMountPoints) {
      const slotKey = `${parent.instanceId}:${slot.id}`;
      if (!occupiedSlots.has(slotKey)) {
        availableSlots.push({
          parentInstanceId: parent.instanceId,
          mountPointId: slot.id,
          name: slot.name,
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

/**
 * Returns all currently free, compatible mounting slots for a part definition.
 * Used for hover highlights, ghost preview, and slot capacity limits.
 */
export function getAvailableSlotsForPart(
  def: PartDef,
  currentParts: PartInstance[],
  catalog: PartDef[]
): MountSlotInfo[] {
  // If ship is currently empty: hull or tank can start the ship
  if (currentParts.length === 0) {
    if (def.category === 'hull' || def.category === 'tank') {
      return [
        {
          parentInstanceId: 'root',
          mountPointId: 'core',
          name: 'PRIMARY CHASSIS CORE',
          canvasX: 200,
          canvasY: 200,
          facing: 'bottom',
          allowedCategories: [def.category],
        },
      ];
    }
    return []; // Non-structural parts cannot float without a hull or tank
  }

  const { availableSlots } = resolveAssemblyLayout(currentParts, catalog);
  return availableSlots.filter((slot) => slot.allowedCategories.includes(def.category));
}

/**
 * Checks whether the spacecraft currently has capacity to install the given part.
 */
export function canAddPart(
  def: PartDef,
  currentParts: PartInstance[],
  catalog: PartDef[]
): boolean {
  return getAvailableSlotsForPart(def, currentParts, catalog).length > 0;
}
