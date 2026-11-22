import test from 'node:test';
import assert from 'node:assert/strict';
import { AgroSwarmSimulation } from './engine';
import { SCENARIO_LIST } from './scenarios/scenarioRegistry';
import { ScenarioId } from './types';

function runToCompletion(id: ScenarioId, maxSteps = 5500) {
  const sim = new AgroSwarmSimulation(id);
  sim.startMission();
  for (let i = 0; i < maxSteps; i++) {
    sim.step(0.033);
    if (sim.world.phase === 'completed') break;
  }
  return sim;
}

test('Initial condition tests: all 14 scenarios initialize deterministically', () => {
  for (const def of SCENARIO_LIST) {
    const sim = new AgroSwarmSimulation(def.id);
    assert.equal(sim.world.scenario, def.id);
    assert.equal(sim.world.robots.length, def.robotCount);
    assert.equal(sim.world.crops.length, 33);
    assert.equal(sim.world.phase, 'briefing');
  }
});

test('Scenario 01 (Tractor Crossing): detects and avoids tractor cleanly', () => {
  const sim = runToCompletion('tractorCrossing');
  assert.equal(sim.world.phase, 'completed');
  assert.equal(sim.world.metrics.cropsRemaining, 0);
  assert.ok(sim.world.metrics.avoidanceEvents >= 1, 'Expected tractor avoidance');
  assert.ok(sim.world.scoreReport && sim.world.scoreReport.totalScore > 65);
});

test('Scenario 02 (Human Safety Zone): enforces safety stop without violations', () => {
  const sim = runToCompletion('humanSafety');
  assert.equal(sim.world.phase, 'completed');
  assert.equal(sim.world.metrics.safetyViolations, 0, 'Expected 0 human safety violations');
  assert.ok(sim.world.humans.length >= 1, 'Human workers should spawn');
});

test('Scenario 03 & 04 (Monsoon Mud & GPS Degradation): terrain adaptation and canopy relocalization', () => {
  const mudSim = runToCompletion('monsoonMud');
  assert.equal(mudSim.world.phase, 'completed');
  assert.ok(mudSim.world.rainIntensity > 0.5);
  assert.ok(mudSim.world.hazardZones.some((h) => h.kind === 'mud'));

  const gpsSim = runToCompletion('gpsDegradation');
  assert.equal(gpsSim.world.phase, 'completed');
  assert.ok(gpsSim.world.hazardZones.some((h) => h.kind === 'canopy'));
});

test('Scenario 05, 06, 07, 08 (Dust, Blocked Row, Charger Failure, Comm Loss): recovery and completion', () => {
  const dustSim = runToCompletion('dustVisibility');
  assert.equal(dustSim.world.phase, 'completed');

  const blockSim = runToCompletion('blockedPath');
  assert.equal(blockSim.world.phase, 'completed');

  const chgSim = runToCompletion('chargerFailure');
  assert.equal(chgSim.world.phase, 'completed');
  assert.ok(chgSim.world.metrics.chargingEvents >= 1);

  const commSim = runToCompletion('communicationLoss');
  assert.equal(commSim.world.phase, 'completed');
});

test('Optional Scenarios 09-12: uneven terrain, missing crops, waterlogging, deadline', () => {
  const uneven = runToCompletion('unevenTerrain');
  assert.equal(uneven.world.phase, 'completed');

  const missing = runToCompletion('missingCrops');
  assert.equal(missing.world.phase, 'completed');
  assert.equal(missing.world.metrics.viableCrops, 26);
  assert.ok(missing.world.metrics.emptySpotsVerified >= 1);

  const water = runToCompletion('waterlogging');
  assert.equal(water.world.phase, 'completed');

  const deadline = runToCompletion('harvestDeadline');
  assert.equal(deadline.world.phase, 'completed');
  assert.ok(deadline.world.metrics.cropsHarvested >= 20);
});

test('Swarm Autonomy Showcase is deterministically repeatable and fires all phases', () => {
  const simA = runToCompletion('showcase');
  const simB = runToCompletion('showcase');

  assert.equal(simA.world.phase, 'completed');
  assert.equal(simA.world.metrics.cropsHarvested, 33);
  assert.ok(
    simA.world.firedTriggerIds.includes('sc-reveal') &&
      simA.world.firedTriggerIds.includes('sc-bidding') &&
      simA.world.firedTriggerIds.includes('sc-tractor') &&
      simA.world.firedTriggerIds.includes('sc-human') &&
      simA.world.firedTriggerIds.includes('sc-charger') &&
      simA.world.firedTriggerIds.includes('sc-resume') &&
      simA.world.firedTriggerIds.includes('sc-finale'),
    `Expected all showcase triggers to fire before completion (duration=${simA.world.metrics.missionDuration.toFixed(1)}s, fired=${simA.world.firedTriggerIds.join(',')})`
  );
  assert.equal(
    simA.world.metrics.missionDuration.toFixed(2),
    simB.world.metrics.missionDuration.toFixed(2)
  );
  assert.equal(
    simA.world.scoreReport?.totalScore,
    simB.world.scoreReport?.totalScore
  );
});

test('Live Challenge Injection alters running world state immediately', () => {
  const sim = new AgroSwarmSimulation('baseline');
  sim.startMission();
  sim.step(0.5);
  const beforeHumans = sim.world.humans.length;
  sim.injectChallenge('human_crossing');
  assert.equal(sim.world.humans.length, beforeHumans + 1);
  sim.injectChallenge('charger_failure');
  assert.ok(sim.world.stations.some((s) => s.offline));
});
