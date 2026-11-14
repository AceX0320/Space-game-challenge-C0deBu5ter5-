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
  attachPoint: { relX: number; relY: number; facing: FacingDirection };
  childMountPoints: MountPointDef[];
}

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
 * Calculates physical rendering dimensions for each part based on its tuned parameters.
 */
export function getPartDimensions(
  inst: PartInstance,
  def: PartDef
): { width: number; height: number; halfH: number; radius: number } {
  const p = inst.paramValues;
  switch (def.category) {
    case 'hull': {
      const busSize = Number(p['busSize'] ?? 1);
      const width = Math.round(68 * busSize);
      const height = Math.round(54 * busSize);
      return { width, height, halfH: height / 2, radius: width / 2 };
    }
    case 'tank': {
      const volume = Number(p['volume'] ?? 1);
      const width = 68;
      const height = Math.round(Math.max(50, Math.min(125, 52 * Math.sqrt(volume))));
      return { width, height, halfH: height / 2, radius: 34 };
    }
    case 'engine': {
      const thrustScale = Number(p['thrustScale'] ?? 1);
      const width = Math.round(28 * thrustScale);
      const height = Math.round(36 * thrustScale);
      return { width, height, halfH: height / 2, radius: width / 2 };
    }
    case 'leg': {
      return { width: 130, height: 48, halfH: 24, radius: 65 };
    }
    case 'heatshield': {
      return { width: 70, height: 14, halfH: 7, radius: 35 };
    }
    case 'parachute': {
      return { width: 44, height: 26, halfH: 13, radius: 22 };
    }
    case 'power': {
      return { width: 60, height: 32, halfH: 16, radius: 30 };
    }
    case 'rcs': {
      return { width: 18, height: 18, halfH: 9, radius: 9 };
    }
    case 'comms': {
      return { width: 34, height: 34, halfH: 17, radius: 17 };
    }
    case 'computer':
    case 'instrument':
    default: {
      return { width: 24, height: 24, halfH: 12, radius: 12 };
    }
  }
}

const LOCAL_STORAGE_KEY = 'launchsmith.ui.mounts';

export function loadMountMap(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMountMap(map: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Standard mount profiles catalog for category compatibility lookups.
 */
export const MOUNT_PROFILES: Record<PartCategory, PartMountProfile> = {
  hull: {
    partCategory: 'hull',
    attachPoint: { relX: 0, relY: 0, facing: 'bottom' },
    childMountPoints: [
      { id: 'top', name: 'Nose Port', relX: 0, relY: -32, facing: 'top', allowedCategories: ['parachute', 'comms', 'instrument', 'computer'] },
      { id: 'bottom', name: 'Interstage Ring', relX: 0, relY: 32, facing: 'bottom', allowedCategories: ['tank', 'engine', 'heatshield'] },
      { id: 'upper-left', name: 'Port Shoulder', relX: -34, relY: -10, facing: 'left', allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'], isRadial: true },
      { id: 'upper-right', name: 'Starboard Shoulder', relX: 34, relY: -10, facing: 'right', allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'], isRadial: true },
      { id: 'lower-left', name: 'Port Bay', relX: -34, relY: 15, facing: 'left', allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'], isRadial: true },
      { id: 'lower-right', name: 'Starboard Bay', relX: 34, relY: 15, facing: 'right', allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'], isRadial: true },
    ],
  },
  tank: {
    partCategory: 'tank',
    attachPoint: { relX: 0, relY: -30, facing: 'top' },
    childMountPoints: [
      { id: 'top', name: 'Tank Top Dome', relX: 0, relY: -30, facing: 'top', allowedCategories: ['hull', 'tank', 'parachute'] },
      { id: 'bottom', name: 'Aft Thrust Structure', relX: 0, relY: 30, facing: 'bottom', allowedCategories: ['engine', 'tank', 'heatshield', 'leg'] },
      { id: 'bottom-2', name: 'Port Engine Mount', relX: -18, relY: 30, facing: 'bottom', allowedCategories: ['engine'] },
      { id: 'bottom-3', name: 'Starboard Engine Mount', relX: 18, relY: 30, facing: 'bottom', allowedCategories: ['engine'] },
      { id: 'bottom-4', name: 'Aft Center Engine Mount', relX: 0, relY: 36, facing: 'bottom', allowedCategories: ['engine'] },
      { id: 'upper-left', name: 'Port Wall Mount', relX: -34, relY: -12, facing: 'left', allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'], isRadial: true },
      { id: 'upper-right', name: 'Starboard Wall Mount', relX: 34, relY: -12, facing: 'right', allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'], isRadial: true },
      { id: 'lower-left', name: 'Port Lower Flank', relX: -34, relY: 15, facing: 'left', allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'], isRadial: true },
      { id: 'lower-right', name: 'Starboard Lower Flank', relX: 34, relY: 15, facing: 'right', allowedCategories: ['leg', 'rcs', 'power', 'instrument', 'computer'], isRadial: true },
    ],
  },
  engine: { partCategory: 'engine', attachPoint: { relX: 0, relY: -18, facing: 'top' }, childMountPoints: [] },
  leg: { partCategory: 'leg', attachPoint: { relX: 0, relY: 0, facing: 'bottom' }, childMountPoints: [] },
  power: { partCategory: 'power', attachPoint: { relX: 0, relY: 0, facing: 'left' }, childMountPoints: [] },
  comms: { partCategory: 'comms', attachPoint: { relX: 0, relY: 14, facing: 'bottom' }, childMountPoints: [] },
  computer: { partCategory: 'computer', attachPoint: { relX: 0, relY: 0, facing: 'left' }, childMountPoints: [] },
  instrument: { partCategory: 'instrument', attachPoint: { relX: 0, relY: 0, facing: 'left' }, childMountPoints: [] },
  heatshield: { partCategory: 'heatshield', attachPoint: { relX: 0, relY: -7, facing: 'top' }, childMountPoints: [] },
  parachute: { partCategory: 'parachute', attachPoint: { relX: 0, relY: 13, facing: 'bottom' }, childMountPoints: [] },
  rcs: { partCategory: 'rcs', attachPoint: { relX: 0, relY: 0, facing: 'left' }, childMountPoints: [] },
};

/**
 * Resolves precision spacecraft assembly layout with seamless structural snapping:
 * 1. Central Spine: Hull and Tanks stack vertically with zero overlap along X = originX.
 * 2. Parachutes snap cleanly to the apex of the top module.
 * 3. Main Engines snap flush to the bottom thrust puck of the lowest stage, perfectly centered.
 * 4. Landing Legs attach symmetrically to the base of the lowest stage, flanking the engine nozzle.
 * 5. Radial accessories (solar arrays, RCS, sensors, batteries) attach flush to the fuselage walls.
 */
export function resolveAssemblyLayout(
  parts: PartInstance[],
  catalog: PartDef[],
  originX = 200,
  originY = 160
): {
  placements: PartPlacement[];
  unmounted: PartInstance[];
  availableSlots: MountSlotInfo[];
} {
  const placements: PartPlacement[] = [];
  const unmounted: PartInstance[] = [];

  if (parts.length === 0) {
    return {
      placements: [],
      unmounted: [],
      availableSlots: [
        {
          parentInstanceId: 'root',
          mountPointId: 'core',
          name: 'CORE STRUCTURAL BUS',
          canvasX: originX,
          canvasY: originY,
          facing: 'bottom',
          allowedCategories: ['hull', 'tank'],
        },
      ],
    };
  }

  // 1. Separate parts by structural role
  const hullInst = parts.find((p) => catalog.find((d) => d.id === p.partId)?.category === 'hull');
  const tankInsts = parts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'tank');
  const engineInsts = parts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'engine');
  const legInsts = parts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'leg');
  const chuteInsts = parts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'parachute');
  const shieldInsts = parts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'heatshield');
  const radialInsts = parts.filter((p) => {
    const cat = catalog.find((d) => d.id === p.partId)?.category;
    return cat && !['hull', 'tank', 'engine', 'leg', 'parachute', 'heatshield'].includes(cat);
  });

  // Track spine positions
  let currentSpineBottom = originY;
  let topSpineY = originY;
  let topStructuralInst: PartInstance | null = null;
  let lowestStructuralInst: PartInstance | null = null;

  // 2. Place Top Hull (if present)
  if (hullInst) {
    const def = catalog.find((d) => d.id === hullInst.partId)!;
    const dims = getPartDimensions(hullInst, def);
    const canvasY = originY;
    topSpineY = canvasY - dims.halfH;
    currentSpineBottom = canvasY + dims.halfH;

    placements.push({
      instanceId: hullInst.instanceId,
      partId: hullInst.partId,
      category: 'hull',
      parentInstanceId: null,
      mountPointId: null,
      canvasX: originX,
      canvasY,
    });

    topStructuralInst = hullInst;
    lowestStructuralInst = hullInst;
  }

  // 3. Stack Propellant Tanks sequentially beneath Hull or top origin
  for (let i = 0; i < tankInsts.length; i++) {
    const tank = tankInsts[i]!;
    const def = catalog.find((d) => d.id === tank.partId)!;
    const dims = getPartDimensions(tank, def);

    let canvasY = currentSpineBottom + dims.halfH;
    if (i === 0 && !hullInst) {
      // Tank is root
      canvasY = originY;
      topSpineY = canvasY - dims.halfH;
      currentSpineBottom = canvasY + dims.halfH;
      topStructuralInst = tank;
    } else {
      currentSpineBottom = canvasY + dims.halfH;
    }

    const parentId = i === 0 ? (hullInst ? hullInst.instanceId : null) : tankInsts[i - 1]!.instanceId;
    placements.push({
      instanceId: tank.instanceId,
      partId: tank.partId,
      category: 'tank',
      parentInstanceId: parentId,
      mountPointId: 'bottom',
      canvasX: originX,
      canvasY,
    });

    lowestStructuralInst = tank;
  }

  // 4. Place Heatshield (if present)
  if (shieldInsts.length > 0 && lowestStructuralInst) {
    const shield = shieldInsts[0]!;
    const def = catalog.find((d) => d.id === shield.partId)!;
    const dims = getPartDimensions(shield, def);
    const canvasY = currentSpineBottom + dims.halfH;
    currentSpineBottom = canvasY + dims.halfH;

    placements.push({
      instanceId: shield.instanceId,
      partId: shield.partId,
      category: 'heatshield',
      parentInstanceId: lowestStructuralInst.instanceId,
      mountPointId: 'bottom',
      canvasX: originX,
      canvasY,
    });
  }

  // 5. Place Parachute (Nose cone at very top of spacecraft)
  if (chuteInsts.length > 0 && topStructuralInst) {
    const chute = chuteInsts[0]!;
    const def = catalog.find((d) => d.id === chute.partId)!;
    const dims = getPartDimensions(chute, def);
    const canvasY = topSpineY - dims.halfH + 2;

    placements.push({
      instanceId: chute.instanceId,
      partId: chute.partId,
      category: 'parachute',
      parentInstanceId: topStructuralInst.instanceId,
      mountPointId: 'top',
      canvasX: originX,
      canvasY,
    });
  }

  // 6. Place Main Rocket Engines (Always centered & clustered under lowest stage)
  const engineHost = lowestStructuralInst;
  const engineMountY = currentSpineBottom;

  if (engineHost && engineInsts.length > 0) {
    const count = engineInsts.length;
    // Calculate cluster X offsets
    let offsets: number[] = [0];
    if (count === 2) offsets = [-18, 18];
    else if (count === 3) offsets = [-24, 0, 24];
    else if (count >= 4) offsets = [-28, -9, 9, 28];

    for (let i = 0; i < count; i++) {
      const eng = engineInsts[i]!;
      const def = catalog.find((d) => d.id === eng.partId)!;
      const dims = getPartDimensions(eng, def);
      const offsetX = offsets[i] ?? 0;
      const canvasY = engineMountY + dims.halfH;

      placements.push({
        instanceId: eng.instanceId,
        partId: eng.partId,
        category: 'engine',
        parentInstanceId: engineHost.instanceId,
        mountPointId: count === 1 ? 'bottom' : `bottom-${i + 1}`,
        canvasX: originX + offsetX,
        canvasY,
      });
    }
  }

  // 7. Place Landing Legs (Symmetrically attached to lowest stage)
  if (engineHost && legInsts.length > 0) {
    const leg = legInsts[0]!;
    // Leg mounts at base of lowest stage; its SVG draws both struts flanking the engines to ground datum
    placements.push({
      instanceId: leg.instanceId,
      partId: leg.partId,
      category: 'leg',
      parentInstanceId: engineHost.instanceId,
      mountPointId: 'bottom',
      canvasX: originX,
      canvasY: engineMountY + 4,
    });
  }

  // 8. Place Radial Components (Solar wings, RCS pods, Comms, Instruments, Computer)
  const hostPlacements = placements.filter((p) => p.category === 'hull' || p.category === 'tank');

  let radialIndex = 0;
  for (const item of radialInsts) {
    const def = catalog.find((d) => d.id === item.partId);
    if (!def) continue;

    const host = hostPlacements[radialIndex % hostPlacements.length];
    if (!host) {
      unmounted.push(item);
      continue;
    }

    const hostDef = catalog.find((d) => d.id === host.partId)!;
    const hostInst = parts.find((p) => p.instanceId === host.instanceId)!;
    const hostDims = getPartDimensions(hostInst, hostDef);

    // Bilateral parts (RCS quad, solar array) center along X = originX so wings/pods flank symmetrically
    if (def.category === 'rcs' || (def.category === 'power' && def.id.includes('solar'))) {
      const canvasY = host.canvasY - hostDims.halfH * 0.35;
      placements.push({
        instanceId: item.instanceId,
        partId: item.partId,
        category: def.category,
        parentInstanceId: host.instanceId,
        mountPointId: 'shoulder-bilateral',
        canvasX: originX,
        canvasY,
      });
    } else {
      // Unilateral parts: alternate between Port (-34px) and Starboard (+34px)
      const isPort = radialIndex % 2 === 0;
      const offsetX = isPort ? -hostDims.radius : hostDims.radius;
      const yOffset = radialIndex % 4 < 2 ? -hostDims.halfH * 0.35 : hostDims.halfH * 0.35;

      placements.push({
        instanceId: item.instanceId,
        partId: item.partId,
        category: def.category,
        parentInstanceId: host.instanceId,
        mountPointId: isPort ? 'port-rack' : 'starboard-rack',
        canvasX: originX + offsetX,
        canvasY: host.canvasY + yOffset,
      });
    }

    radialIndex++;
  }

  // 9. Calculate available mounting slots for hover preview, ghost guides, and limits
  const availableSlots: MountSlotInfo[] = [];

  // Apex slot: if no parachute and top structural part exists
  if (chuteInsts.length === 0 && topStructuralInst) {
    availableSlots.push({
      parentInstanceId: topStructuralInst.instanceId,
      mountPointId: 'top',
      name: 'NOSE AVIONICS & PARACHUTE APEX',
      canvasX: originX,
      canvasY: topSpineY - 14,
      facing: 'top',
      allowedCategories: ['parachute', 'comms', 'instrument', 'computer'],
    });
  }

  // Interstage tank stack slot: under lowest structural part
  if (lowestStructuralInst) {
    availableSlots.push({
      parentInstanceId: lowestStructuralInst.instanceId,
      mountPointId: 'interstage-tank',
      name: 'INTERSTAGE PROPELLANT STACK',
      canvasX: originX,
      canvasY: currentSpineBottom + 28,
      facing: 'bottom',
      allowedCategories: ['tank', 'heatshield'],
    });
  }

  // Engine cluster thrust puck slots: under lowest stage (up to 4 engines)
  if (lowestStructuralInst && engineInsts.length < 4) {
    const curEngCount = engineInsts.length;
    let nextOffset = 0;
    if (curEngCount === 0) nextOffset = 0;
    else if (curEngCount === 1) nextOffset = 18;
    else if (curEngCount === 2) nextOffset = -24;
    else nextOffset = 28;

    availableSlots.push({
      parentInstanceId: lowestStructuralInst.instanceId,
      mountPointId: `engine-${curEngCount + 1}`,
      name: curEngCount === 0 ? 'MAIN THRUST PUCK' : 'ENGINE CLUSTER EXPANSION',
      canvasX: originX + nextOffset,
      canvasY: currentSpineBottom + 18,
      facing: 'bottom',
      allowedCategories: ['engine'],
    });
  }

  // Landing leg slot: under lowest stage (max 1 leg system per ship)
  if (lowestStructuralInst && legInsts.length === 0) {
    availableSlots.push({
      parentInstanceId: lowestStructuralInst.instanceId,
      mountPointId: 'landing-gear',
      name: 'BILATERAL LANDING GEAR HARDPOINTS',
      canvasX: originX,
      canvasY: currentSpineBottom + 4,
      facing: 'bottom',
      allowedCategories: ['leg'],
    });
  }

  // Radial equipment slots on all structural parts
  for (const host of hostPlacements) {
    const hostInst = parts.find((p) => p.instanceId === host.instanceId);
    const hostDef = catalog.find((d) => d.id === host.partId);
    if (!hostInst || !hostDef) continue;
    const dims = getPartDimensions(hostInst, hostDef);

    availableSlots.push({
      parentInstanceId: host.instanceId,
      mountPointId: 'port-shoulder',
      name: 'PORT EQUIPMENT BAY',
      canvasX: originX - dims.radius,
      canvasY: host.canvasY - dims.halfH * 0.35,
      facing: 'left',
      allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
    });

    availableSlots.push({
      parentInstanceId: host.instanceId,
      mountPointId: 'starboard-shoulder',
      name: 'STARBOARD EQUIPMENT BAY',
      canvasX: originX + dims.radius,
      canvasY: host.canvasY - dims.halfH * 0.35,
      facing: 'right',
      allowedCategories: ['power', 'comms', 'instrument', 'rcs', 'computer'],
    });
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
          canvasY: 160,
          facing: 'bottom',
          allowedCategories: [def.category],
        },
      ];
    }
    return [];
  }

  // Capacity caps:
  // - Hull: max 1 per spacecraft
  if (def.category === 'hull') {
    const hasHull = currentParts.some((p) => catalog.find((d) => d.id === p.partId)?.category === 'hull');
    if (hasHull) return [];
  }
  // - Parachute: max 1 per spacecraft
  if (def.category === 'parachute') {
    const hasChute = currentParts.some((p) => catalog.find((d) => d.id === p.partId)?.category === 'parachute');
    if (hasChute) return [];
  }
  // - Landing Legs: max 1 system per spacecraft
  if (def.category === 'leg') {
    const hasLeg = currentParts.some((p) => catalog.find((d) => d.id === p.partId)?.category === 'leg');
    if (hasLeg) return [];
  }
  // - Heatshield: max 1 per spacecraft
  if (def.category === 'heatshield') {
    const hasShield = currentParts.some((p) => catalog.find((d) => d.id === p.partId)?.category === 'heatshield');
    if (hasShield) return [];
  }
  // - Engines: max 4 cluster engines per spacecraft
  if (def.category === 'engine') {
    const engineCount = currentParts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'engine').length;
    if (engineCount >= 4) return [];
  }
  // - Tanks: max 3 stages per spacecraft
  if (def.category === 'tank') {
    const tankCount = currentParts.filter((p) => catalog.find((d) => d.id === p.partId)?.category === 'tank').length;
    if (tankCount >= 3) return [];
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
