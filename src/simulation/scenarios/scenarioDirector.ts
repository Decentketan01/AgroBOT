import { WorldState } from '../types';
import { applyDisturbance, LogEventFn } from './disturbanceManager';
import { getScenarioDefinition } from './scenarioRegistry';

export function evaluateScenarioDirector(
  world: WorldState,
  logEvent: LogEventFn
): void {
  const scenario = getScenarioDefinition(world.scenario);

  for (const trig of scenario.triggers) {
    if (world.firedTriggerIds.includes(trig.id)) continue;

    let shouldFire = false;
    if (trig.atTime !== undefined && world.simTime >= trig.atTime) {
      shouldFire = true;
    } else if (
      trig.condition === 'halfHarvested' &&
      world.metrics.cropsHarvested >= Math.floor(world.metrics.viableCrops * 0.5)
    ) {
      shouldFire = true;
    } else if (
      trig.condition === 'firstLowBattery' &&
      world.robots.some((r) => r.battery <= 28)
    ) {
      shouldFire = true;
    }

    if (!shouldFire) continue;

    world.firedTriggerIds.push(trig.id);

    // Apply environmental event (never scripts robot actions!)
    // For sc-reveal in showcase, only emit cue/camera if already initialized
    if (trig.id !== 'sc-reveal') {
      applyDisturbance(world, trig.type, logEvent, trig.params, false);
    } else {
      logEvent(
        world,
        'EVENT',
        'action',
        'DIRECTOR',
        trig.label,
        '90-second Swarm Autonomy Showcase sequence started under deterministic seed.'
      );
    }

    if (trig.cueTitle && trig.cueSubtitle) {
      world.activeCue = {
        id: trig.id,
        title: trig.cueTitle,
        subtitle: trig.cueSubtitle,
        time: world.simTime,
      };
    }

    if (trig.cameraPreset) {
      world.requestedCameraMode = trig.cameraPreset;
    }
  }

  // Final Showcase closing cue
  if (
    world.scenario === 'showcase' &&
    world.firedTriggerIds.includes('sc-resume') &&
    (world.simTime >= 53 ||
      world.metrics.cropsHarvested >= Math.max(1, world.metrics.viableCrops - 2)) &&
    !world.firedTriggerIds.includes('sc-finale')
  ) {
    world.firedTriggerIds.push('sc-finale');
    world.activeCue = {
      id: 'sc-finale',
      title: 'Phase 7 · Final Harvest & Score Evaluation',
      subtitle: 'Swarm completes remaining field targets and calculates verified safety, energy, and yield scores.',
      time: world.simTime,
    };
  }
}
