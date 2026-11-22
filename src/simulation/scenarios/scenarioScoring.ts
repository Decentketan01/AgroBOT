import { ScenarioScoreReport, WorldState } from '../types';

export function computeScenarioScore(world: WorldState): ScenarioScoreReport {
  const m = world.metrics;
  const viable = Math.max(1, m.viableCrops);

  // 1. Harvesting completion: 35%
  const harvestRatio = Math.min(1, m.cropsHarvested / viable);
  const harvesting = Number((harvestRatio * 35).toFixed(1));

  // 2. Safety: 30% (real penalty for collisions and human safety violations)
  const safetyPenalty =
    m.collisionEvents * 10 +
    m.safetyViolations * 14 +
    Math.max(0, m.nearCollisions - 6) * 0.5;
  const safety = Number(Math.max(0, 30 - safetyPenalty).toFixed(1));

  // 3. Energy efficiency: 20%
  const strandedRobots = world.robots.filter((r) => r.battery <= 0.5).length;
  const energyPerCrop = m.cropsHarvested > 0 ? m.energyConsumed / m.cropsHarvested : 25;
  const effRatio = Math.max(0, Math.min(1, 1 - Math.max(0, energyPerCrop - 6.0) / 14.0));
  const strandPenalty = strandedRobots * 8;
  const energy = Number(Math.max(0, effRatio * 20 - strandPenalty).toFixed(1));

  // 4. Coordination and recovery: 15%
  const deadlineMissed =
    world.deadlineSec !== null && m.missionDuration > world.deadlineSec && m.cropsRemaining > 0;
  const recoveryActivity =
    m.routeReplans + m.taskReassignments + m.deadlockRecoveries + m.relocalizationEvents;
  let coordBase = 15;
  if (harvestRatio < 0.85) coordBase -= (1 - harvestRatio) * 10;
  if (deadlineMissed) coordBase -= 4;
  if (m.chargingWaitTime > 25) coordBase -= 2;
  if (recoveryActivity > 0 && m.collisionEvents === 0) {
    coordBase = Math.min(15, coordBase + 1.0);
  }
  const coordination = Number(Math.max(0, coordBase).toFixed(1));

  const totalScore = Number(
    Math.min(100, harvesting + safety + energy + coordination).toFixed(1)
  );

  const grade: ScenarioScoreReport['grade'] =
    totalScore >= 92
      ? 'S'
      : totalScore >= 82
        ? 'A'
        : totalScore >= 70
          ? 'B'
          : totalScore >= 55
            ? 'C'
            : 'D';

  const status: ScenarioScoreReport['status'] =
    m.cropsRemaining === 0 && m.safetyViolations === 0 && strandedRobots === 0
      ? 'PASSED'
      : m.cropsHarvested >= Math.ceil(viable * 0.65)
        ? 'PARTIAL'
        : 'FAILED';

  const achievements: string[] = [];
  if (m.cropsRemaining === 0) achievements.push('100% Field Yield');
  if (m.collisionEvents === 0 && m.safetyViolations === 0) {
    achievements.push('Zero Safety Incidents');
  }
  if (m.safetyStops > 0 && m.safetyViolations === 0) {
    achievements.push('Human Safety Certified');
  }
  if (m.avoidanceEvents > 0 && m.collisionEvents === 0) {
    achievements.push('Dynamic Obstacle Ace');
  }
  if (m.relocalizationEvents > 0) {
    achievements.push('Canopy Odometry Recovery');
  }
  if (m.chargingEvents > 0 && strandedRobots === 0) {
    achievements.push('Zero-Stranding Energy Ops');
  }
  if (m.taskReassignments > 0 || m.routeReplans > 2) {
    achievements.push('Adaptive Replanning');
  }

  const keyDecisions = world.events
    .filter((e) => e.category === 'DECISION' || e.category === 'COORDINATION' || e.category === 'ENERGY')
    .slice(0, 5)
    .map((e) => `${e.time.toFixed(1)}s [${e.source}] ${e.message}`);

  const failuresAndRecoveries = world.events
    .filter((e) => e.category === 'RECOVERY' || e.severity === 'warning')
    .slice(0, 5)
    .map((e) => `${e.time.toFixed(1)}s [${e.category}] ${e.message}`);

  return {
    totalScore,
    grade,
    status,
    breakdown: {
      harvesting,
      safety,
      energy,
      coordination,
    },
    achievements,
    keyDecisions,
    failuresAndRecoveries,
  };
}
