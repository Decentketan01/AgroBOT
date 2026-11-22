import { Vec2 } from '../types';

export type ChallengeScenarioId =
  | 'showcase'
  | 'baseline'
  | 'tractorCrossing'
  | 'humanSafety'
  | 'monsoonMud'
  | 'gpsDegradation'
  | 'dustVisibility'
  | 'blockedPath'
  | 'chargerFailure'
  | 'communicationLoss'
  | 'unevenTerrain'
  | 'missingCrops'
  | 'waterlogging'
  | 'harvestDeadline';

export type ScenarioDifficulty = 'Standard' | 'Moderate' | 'Hard' | 'Extreme';

export type ChallengeType =
  | 'Baseline'
  | 'Traffic'
  | 'Human Safety'
  | 'Weather & Traction'
  | 'Localization'
  | 'Perception'
  | 'Obstruction'
  | 'Energy Emergency'
  | 'Coordination'
  | 'Terrain Cost'
  | 'Verification'
  | 'Hazard Avoidance'
  | 'Time-Critical'
  | 'Full Showcase';

export type DisturbanceType =
  | 'tractor_crossing'
  | 'human_crossing'
  | 'monsoon_rain'
  | 'mud_patch'
  | 'gps_canopy'
  | 'dust_cloud'
  | 'blocked_row'
  | 'charger_failure'
  | 'comm_blackspot'
  | 'uneven_slope'
  | 'waterlog_leak'
  | 'weather_deadline';

export interface ScenarioTrigger {
  id: string;
  atTime?: number;
  condition?: 'halfHarvested' | 'firstLowBattery';
  type: DisturbanceType;
  label: string;
  cueTitle?: string;
  cueSubtitle?: string;
  cameraPreset?: 'orbit' | 'isometric' | 'follow';
  focusRobotId?: string;
  params?: {
    position?: Vec2;
    target?: Vec2;
    radius?: number;
    duration?: number;
    stationId?: string;
    speed?: number;
  };
}

export interface ScenarioDefinition {
  id: ChallengeScenarioId;
  code: string;
  name: string;
  difficulty: ScenarioDifficulty;
  challengeType: ChallengeType;
  realWorldProblem: string;
  description: string;
  expectedBehaviour: string;
  estimatedDurationSec: number;
  seed: number;
  robotCount: number;
  robotBatteries: [number, number, number];
  obstacleSpeedScale: number;
  isOptional?: boolean;
  isShowcase?: boolean;
  missingCropIndices?: number[];
  deadlineSec?: number;
  criticalCropIndices?: number[];
  objectives: string[];
  successCriteria: string[];
  failureConditions: string[];
  evaluationMetrics: string[];
  initialDisturbances: DisturbanceType[];
  triggers: ScenarioTrigger[];
  previewAccent: string;
  previewSecondary: string;
}
