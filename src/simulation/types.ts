import { ChallengeScenarioId } from './scenarios/scenarioTypes';

export type Vec2 = {
  x: number;
  z: number;
};

export type RobotFSMState =
  | 'IDLE'
  | 'EXPLORING'
  | 'MOVING'
  | 'HARVESTING'
  | 'RETURNING'
  | 'CHARGING'
  | 'AVOIDING'
  | 'RECOVERING'
  | 'SAFETY_STOP'
  | 'RELOCALIZING';

export type CropType = 'wheat' | 'maize' | 'sunflower';

export interface CropNode {
  id: string;
  plotId: string;
  cropType: CropType;
  position: Vec2;
  discovered: boolean;
  harvested: boolean;
  harvestProgress: number; // 0..1
  claimedBy: string | null;
  leaseExpiresAt: number;
  cooldownUntil: number;
  yieldKg: number;
  isMissing: boolean;
  verifiedEmpty: boolean;
  priority: 'normal' | 'critical';
}

export interface ChargingStation {
  id: string;
  name: string;
  position: Vec2;
  waitPosition: Vec2;
  occupiedBy: string | null;
  queue: string[];
  totalCharges: number;
  powerDelivered: number;
  offline: boolean;
  offlineUntil: number | null;
}

export type ObstacleKind = 'tractor' | 'utility_cart' | 'sprayer';

export interface MovingObstacle {
  id: string;
  name: string;
  kind: ObstacleKind;
  position: Vec2;
  heading: number;
  speed: number;
  radius: number;
  waypoints: Vec2[];
  currentWaypointIndex: number;
  wheelRotation: number;
  activeWarning: boolean;
  temporary?: boolean;
}

export interface HumanWorker {
  id: string;
  name: string;
  position: Vec2;
  heading: number;
  speed: number;
  safetyRadius: number;
  start: Vec2;
  end: Vec2;
  returning: boolean;
  walkCycle: number;
  safetyStopTriggered: boolean;
}

export type HazardZoneKind =
  | 'mud'
  | 'canopy'
  | 'dust'
  | 'comm_blackspot'
  | 'slope'
  | 'waterlog';

export interface HazardZone {
  id: string;
  kind: HazardZoneKind;
  label: string;
  position: Vec2;
  radius: number;
  tractionFactor: number; // 1.0 normal, 0.45 mud
  energyMultiplier: number; // 1.0 normal, 1.85 mud
  sensorScale: number; // 1.0 normal, 0.52 dust
  gpsConfidenceDrop: number; // 0 normal, 0.65 canopy
  commBlocked: boolean;
  unsafe: boolean; // true for waterlogging
  expiresAt: number | null;
}

export interface StaticRowObstacle {
  id: string;
  label: string;
  kind: 'crates' | 'irrigation_pipe';
  position: Vec2;
  radius: number;
  expiresAt: number | null;
}

export interface ObservationEntry {
  kind: 'crop' | 'obstacle' | 'robot' | 'station' | 'human' | 'hazard';
  id: string;
  label: string;
  distance: number;
  detail: string;
}

export interface RobotAgent {
  id: string;
  name: string;
  callsign: string;
  accentColor: string;
  position: Vec2;
  heading: number;
  speed: number;
  maxSpeed: number;
  wheelRotation: number;
  steeringAngle: number;
  battery: number; // 0..100
  sensorRadius: number;
  effectiveSensorRadius: number;
  state: RobotFSMState;
  objective: string;
  decisionReason: string;
  observations: ObservationEntry[];
  path: Vec2[];
  targetPos: Vec2 | null;
  targetCropId: string | null;
  targetStationId: string | null;
  cropsHarvested: number;
  distanceTraveled: number;
  energyConsumed: number;
  stuckTimer: number;
  lastProgressPos: Vec2;
  avoidanceTimer: number;
  avoidanceDir: Vec2 | null;
  recoveryTimer: number;
  harvestBeat: number;
  // Real-world challenge states
  localizationConfidence: number; // 0..1 (simulated)
  positionDrift: Vec2;
  perceptionConfidence: number; // 0..1
  commOnline: boolean;
  relocalizeTimer: number;
  reobserveTimer: number;
  safetyStopReason: string | null;
  chargingWaitTimer: number;
  localClaimMemory: Record<string, number>;
}

export type SimEventSeverity = 'info' | 'action' | 'warning' | 'success';

export type SimEventCategory =
  | 'EVENT'
  | 'PERCEPTION'
  | 'DECISION'
  | 'NAVIGATION'
  | 'COORDINATION'
  | 'ENERGY'
  | 'RECOVERY';

export interface SimEvent {
  id: string;
  time: number;
  severity: SimEventSeverity;
  category: SimEventCategory;
  source: string;
  message: string;
  explanation: string;
  details?: Record<string, string | number>;
}

export interface EnergySample {
  time: number;
  avgBattery: number;
  minBattery: number;
  harvested: number;
}

export interface MissionMetrics {
  totalCrops: number;
  viableCrops: number;
  cropsHarvested: number;
  cropsRemaining: number;
  discoveredCrops: number;
  missionDuration: number;
  energyConsumed: number;
  averageBattery: number;
  chargingEvents: number;
  taskCompletionRate: number;
  collisionEvents: number;
  nearCollisions: number;
  avoidanceEvents: number;
  safetyViolations: number;
  safetyStops: number;
  routeReplans: number;
  chargingWaitTime: number;
  taskReassignments: number;
  deadlockRecoveries: number;
  relocalizationEvents: number;
  reobservationChecks: number;
  droppedMessages: number;
  emptySpotsVerified: number;
  exploredPercent: number;
}

export interface ScoreBreakdown {
  harvesting: number; // max 35
  safety: number; // max 30
  energy: number; // max 20
  coordination: number; // max 15
}

export interface ScenarioScoreReport {
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'PASSED' | 'PARTIAL' | 'FAILED';
  breakdown: ScoreBreakdown;
  achievements: string[];
  keyDecisions: string[];
  failuresAndRecoveries: string[];
}

export type ScenarioId = ChallengeScenarioId;
export type CameraMode = 'orbit' | 'isometric' | 'follow';
export type MissionPhase = 'briefing' | 'running' | 'paused' | 'completed';

export interface ShowcaseCue {
  id: string;
  title: string;
  subtitle: string;
  time: number;
}

export interface WorldState {
  scenario: ScenarioId;
  seed: number;
  phase: MissionPhase;
  simTime: number;
  speedMultiplier: 1 | 2 | 4;
  gridCols: number;
  gridRows: number;
  cellSize: number;
  fieldHalfSize: number;
  exploredGrid: Uint8Array; // 0 = unexplored, 1 = explored
  blockedGrid: Uint8Array; // 0 = clear, 1 = obstacle
  terrainCostGrid: Float32Array; // >= 1.0 traversal cost multiplier
  crops: CropNode[];
  robots: RobotAgent[];
  stations: ChargingStation[];
  obstacles: MovingObstacle[];
  humans: HumanWorker[];
  hazardZones: HazardZone[];
  staticObstacles: StaticRowObstacle[];
  rainIntensity: number; // 0..1
  dustIntensity: number; // 0..1
  groundWetness: number; // 0..1
  deadlineSec: number | null;
  firedTriggerIds: string[];
  events: SimEvent[];
  energyHistory: EnergySample[];
  metrics: MissionMetrics;
  activeCue: ShowcaseCue | null;
  requestedCameraMode: CameraMode | null;
  missionOutcome: 'pending' | 'complete' | 'incomplete';
  outcomeReason: string;
  scoreReport: ScenarioScoreReport | null;
  harvestParticlesTrigger: { id: string; position: Vec2; cropType: CropType; time: number }[];
}
