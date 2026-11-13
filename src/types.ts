export type Difficulty = 'easy' | 'normal' | 'hard' | 'sandbox';
export type DataSource = 'nasa' | 'game' | 'fictional';

export type PartCategory =
  | 'engine' | 'tank' | 'rcs' | 'leg' | 'hull' | 'power'
  | 'comms' | 'computer' | 'instrument' | 'heatshield' | 'parachute';

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  explain: string;
}

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  source: DataSource;
  description: string;
  baseMassKg: number;
  baseCostM: number;
  basePowerW: number;
  baseWearPerMission: number;
  params: ParamSpec[];
  stats: PartStats;
  unlocksBy?: string;
}

export interface PartStats {
  thrustN?: number; ispS?: number; gimbalDeg?: number;
  fuelCapacityKg?: number;
  rcsThrustN?: number;
  legLengthM?: number; footpadM?: number; shockStiffness?: number;
  structureStrength?: number;
  solarAreaM2?: number; batteryWh?: number;
  downlinkKbps?: number; antennaGainDb?: number;
  assistLevel?: number;
  instrumentKind?: InstrumentKind; dataRateKbps?: number; scienceValue?: number;
  heatCapacityMJ?: number; dragAreaM2?: number; singleUse?: boolean;
}

export type InstrumentKind = 'camera' | 'spectrometer' | 'drill' | 'seismometer' | 'weather';

export interface PartInstance {
  instanceId: string;
  partId: string;
  paramValues: Record<string, number>;
  condition: number;
  maxCondition: number;
}

export interface ShipDesign {
  id: string;
  name: string;
  contractId?: string;
  parts: PartInstance[];
}

export interface ShipStats {
  totalMassKg: number;
  dryMassKg: number;
  fuelMassKg: number;
  deltaVms: number;
  thrustN: number;
  twr: number;
  powerGenW: number;
  powerDrawW: number;
  batteryWh: number;
  dataGenKbps: number;
  downlinkKbps: number;
  dataBufferMB: number;
  costM: number;
  reliability: number;
  controlAuthority: number;
  touchdownLimits: { maxVyMs: number; maxVxMs: number; maxTiltDeg: number };
  warnings: string[];
  valid: boolean;
  violations: string[];
}

export interface AtmosphereSpec {
  surfaceDensityKgM3: number;
  scaleHeightM: number;
}

export interface Body {
  id: string;
  name: string;
  source: DataSource;
  gravityMs2: number;
  atmosphere: AtmosphereSpec | null;
  baseLifetimeS: number;
  solarFlux: number;
  note?: string;
}

export interface Contract {
  id: string;
  title: string;
  bodyId: string;
  objective: string;
  requiredInstruments: InstrumentKind[];
  budgetCapM: number;
  rewardM: number;
  fundingGateM: number;
  unlocksContractId?: string;
  bonusObjectives?: { id: string; text: string; extraRewardM: number }[];
}

export type FlightOutcome = 'soft' | 'rough' | 'crash' | 'abort';

export interface FlightResult {
  outcome: FlightOutcome;
  landingRing: number;
  distanceFromTargetM: number;
  touchdownVyMs: number;
  touchdownVxMs: number;
  touchdownTiltDeg: number;
  fuelLeftKg: number;
  ascentFuelUsedPct: number;
  corrections: number;
  events: MissionEvent[];
}

export interface MissionEvent {
  tS: number;
  kind: 'info' | 'warning' | 'failure' | 'malfunction' | 'milestone';
  text: string;
  partInstanceId?: string;
}

export interface FoundItem {
  itemId: string;
  tS: number;
  quantity: number;
  transmitted: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  bodyIds: string[];
  requiresInstrument: InstrumentKind[];
  dataMB: number;
  scienceValue: number;
  source: DataSource;
  researchNodeId?: string;
}

export interface ScavengeResult {
  itemsFound: FoundItem[];
  dataGeneratedMB: number;
  dataSentMB: number;
  timeUsedS: number;
  timeAvailableS: number;
  endedBy: 'timer' | 'power' | 'part-failure' | 'data-full';
  events: MissionEvent[];
}

export interface MissionResult {
  contractId: string;
  difficulty: Difficulty;
  flight: FlightResult;
  scavenge: ScavengeResult | null;
  partWearDelta: Record<string, number>;
  malfunctions: string[];
}

export type StreakTrack =
  | 'cleanAscent' | 'smoothHands' | 'pinpoint' | 'softTouch' | 'frugal';

export interface ScoreBreakdown {
  landing: number; science: number; efficiency: number;
  decisions: number; teamBonus: number; total: number;
}

export interface PayoutResult {
  grossRewardM: number;
  buildCostM: number;
  launchCostM: number;
  repairCostM: number;
  streakMultiplier: number;
  netM: number;
  isRecord: boolean;
  score: ScoreBreakdown;
}

export interface ResearchNode {
  id: string;
  name: string;
  branch: 'propulsion' | 'materials' | 'power' | 'science';
  costM: number;
  requiresItems: { itemId: string; quantity: number }[];
  requiresNodes: string[];
  unlocksPartIds: string[];
  description: string;
  source: DataSource;
}

export interface SaveGame {
  version: number;
  fundsM: number;
  difficulty: Difficulty;
  unlockedContractIds: string[];
  completedContracts: Record<string, { bestNetM: number; bestScore: number; plays: number }>;
  streaks: Record<StreakTrack, number>;
  safetyNets: number;
  inventory: { itemId: string; quantity: number }[];
  researched: string[];
  ownedParts: PartInstance[];
  currentDesign: ShipDesign | null;
}

export type TeamRole = 'director' | 'engineer' | 'science' | 'operations';

export interface DesignFlag {
  id: string;
  role: TeamRole;
  text: string;
  resolved: boolean;
  acceptedAsRisk: boolean;
}

export interface ReportItem {
  severity: 'good' | 'info' | 'warning' | 'critical';
  text: string;
}

export interface MissionReport {
  headline: string;
  outcome: FlightOutcome;
  causes: ReportItem[];
  suggestions: string[];
  timeline: MissionEvent[];
  similarRealMission?: string;
}

export type GamePhase =
  | 'home' | 'contracts' | 'hangar' | 'preflight'
  | 'flight' | 'scavenge' | 'results' | 'research' | 'team';
