import { ChallengeScenarioId, ScenarioDefinition } from './scenarioTypes';
import {
  baselineScenario,
  gpsDegradationScenario,
  humanSafetyScenario,
  monsoonMudScenario,
  tractorCrossingScenario,
} from './scenarios/primaryA';
import {
  blockedPathScenario,
  chargerFailureScenario,
  communicationLossScenario,
  dustVisibilityScenario,
} from './scenarios/primaryB';
import {
  harvestDeadlineScenario,
  missingCropsScenario,
  showcaseScenario,
  unevenTerrainScenario,
  waterloggingScenario,
} from './scenarios/secondaryAndShowcase';

export const SCENARIO_REGISTRY: Record<ChallengeScenarioId, ScenarioDefinition> = {
  showcase: showcaseScenario,
  baseline: baselineScenario,
  tractorCrossing: tractorCrossingScenario,
  humanSafety: humanSafetyScenario,
  monsoonMud: monsoonMudScenario,
  gpsDegradation: gpsDegradationScenario,
  dustVisibility: dustVisibilityScenario,
  blockedPath: blockedPathScenario,
  chargerFailure: chargerFailureScenario,
  communicationLoss: communicationLossScenario,
  unevenTerrain: unevenTerrainScenario,
  missingCrops: missingCropsScenario,
  waterlogging: waterloggingScenario,
  harvestDeadline: harvestDeadlineScenario,
};

export const SCENARIO_LIST: ScenarioDefinition[] = [
  showcaseScenario,
  baselineScenario,
  tractorCrossingScenario,
  humanSafetyScenario,
  monsoonMudScenario,
  gpsDegradationScenario,
  dustVisibilityScenario,
  blockedPathScenario,
  chargerFailureScenario,
  communicationLossScenario,
  unevenTerrainScenario,
  missingCropsScenario,
  waterloggingScenario,
  harvestDeadlineScenario,
];

export function getScenarioDefinition(id: ChallengeScenarioId): ScenarioDefinition {
  return SCENARIO_REGISTRY[id] ?? baselineScenario;
}
