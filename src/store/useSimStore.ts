import { create } from 'zustand';
import { AgroSwarmSimulation } from '../simulation/engine';
import { DisturbanceType } from '../simulation/scenarios/scenarioTypes';
import { getScenarioDefinition } from '../simulation/scenarios/scenarioRegistry';
import {
  CameraMode,
  MissionPhase,
  ScenarioId,
  ScenarioScoreReport,
  SimEvent,
  WorldState,
} from '../simulation/types';

export const simulation = new AgroSwarmSimulation('showcase');

export interface ComparisonResultEntry {
  id: ScenarioId;
  label: string;
  completionRate: number;
  energyConsumed: number;
  durationSec: number;
  safetyEvents: number;
  recoveryEvents: number;
  totalScore: number;
}

interface SimUIStore {
  worldSnapshot: WorldState;
  selectedRobotId: string;
  cameraMode: CameraMode;
  showSensors: boolean;
  showPaths: boolean;
  debugMode: boolean;
  muted: boolean;
  phase: MissionPhase;
  scenario: ScenarioId;
  speedMultiplier: 1 | 2 | 4;

  // Arena, Live Injection, Event Inspection & Comparison UI state
  arenaOpen: boolean;
  comparisonOpen: boolean;
  injectMenuOpen: boolean;
  inspectedEvent: SimEvent | null;
  comparisonResults: ComparisonResultEntry[] | null;

  syncSnapshot: () => void;
  startMission: () => void;
  startShowcase: () => void;
  previewScenario: (scenario: ScenarioId) => void;
  launchScenario: (scenario: ScenarioId) => void;
  pauseMission: () => void;
  resumeMission: () => void;
  resetMission: (scenario?: ScenarioId) => void;
  setScenario: (scenario: ScenarioId) => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  setCameraMode: (mode: CameraMode) => void;
  selectRobot: (robotId: string) => void;
  toggleSensors: () => void;
  togglePaths: () => void;
  toggleDebug: () => void;
  toggleMuted: () => void;

  setArenaOpen: (open: boolean) => void;
  setComparisonOpen: (open: boolean) => void;
  setInjectMenuOpen: (open: boolean) => void;
  setInspectedEvent: (ev: SimEvent | null) => void;
  injectChallenge: (type: DisturbanceType) => void;
  runComparisonSuite: () => void;
}

function cloneWorldForHUD(w: WorldState): WorldState {
  return {
    ...w,
    crops: w.crops.map((c) => ({ ...c, position: { ...c.position } })),
    robots: w.robots.map((r) => ({
      ...r,
      position: { ...r.position },
      observations: [...r.observations],
      path: [...r.path],
    })),
    stations: w.stations.map((s) => ({ ...s, queue: [...s.queue] })),
    obstacles: w.obstacles.map((o) => ({ ...o, position: { ...o.position } })),
    humans: w.humans.map((h) => ({ ...h, position: { ...h.position } })),
    hazardZones: w.hazardZones.map((hz) => ({ ...hz, position: { ...hz.position } })),
    staticObstacles: w.staticObstacles.map((so) => ({ ...so, position: { ...so.position } })),
    events: [...w.events],
    energyHistory: [...w.energyHistory],
    metrics: { ...w.metrics },
    activeCue: w.activeCue ? { ...w.activeCue } : null,
    scoreReport: w.scoreReport ? ({ ...w.scoreReport } as ScenarioScoreReport) : null,
  };
}

export const useSimStore = create<SimUIStore>((set, get) => ({
  worldSnapshot: cloneWorldForHUD(simulation.world),
  selectedRobotId: 'AS-01',
  cameraMode: 'orbit',
  showSensors: true,
  showPaths: true,
  debugMode: false,
  muted: false,
  phase: simulation.world.phase,
  scenario: simulation.world.scenario,
  speedMultiplier: simulation.world.speedMultiplier,

  arenaOpen: false,
  comparisonOpen: false,
  injectMenuOpen: false,
  inspectedEvent: null,
  comparisonResults: null,

  syncSnapshot: () => {
    const reqCam = simulation.world.requestedCameraMode;
    if (reqCam) {
      simulation.world.requestedCameraMode = null;
      set({ cameraMode: reqCam });
    }
    set({
      worldSnapshot: cloneWorldForHUD(simulation.world),
      phase: simulation.world.phase,
      speedMultiplier: simulation.world.speedMultiplier,
    });
  },

  startMission: () => {
    simulation.startMission();
    set({ arenaOpen: false });
    get().syncSnapshot();
  },

  startShowcase: () => {
    simulation.reset('showcase');
    simulation.startMission();
    set({
      scenario: 'showcase',
      cameraMode: 'orbit',
      showSensors: true,
      showPaths: true,
      selectedRobotId: 'AS-01',
      arenaOpen: false,
      comparisonOpen: false,
      injectMenuOpen: false,
    });
    get().syncSnapshot();
  },

  previewScenario: (scenario) => {
    simulation.reset(scenario);
    set({
      scenario,
      phase: simulation.world.phase,
      speedMultiplier: simulation.world.speedMultiplier,
      arenaOpen: false,
    });
    get().syncSnapshot();
  },

  launchScenario: (scenario) => {
    simulation.reset(scenario);
    simulation.startMission();
    set({
      scenario,
      cameraMode: 'orbit',
      selectedRobotId: 'AS-01',
      arenaOpen: false,
      comparisonOpen: false,
      injectMenuOpen: false,
    });
    get().syncSnapshot();
  },

  pauseMission: () => {
    simulation.pause();
    get().syncSnapshot();
  },

  resumeMission: () => {
    simulation.resume();
    get().syncSnapshot();
  },

  resetMission: (scenarioOverride) => {
    const targetScenario = scenarioOverride ?? get().scenario;
    simulation.reset(targetScenario);
    set({
      scenario: targetScenario,
      phase: simulation.world.phase,
      speedMultiplier: simulation.world.speedMultiplier,
      inspectedEvent: null,
    });
    get().syncSnapshot();
  },

  setScenario: (scenario) => {
    simulation.reset(scenario);
    set({
      scenario,
      phase: simulation.world.phase,
      speedMultiplier: simulation.world.speedMultiplier,
      inspectedEvent: null,
    });
    get().syncSnapshot();
  },

  setSpeed: (speed) => {
    simulation.setSpeed(speed);
    set({ speedMultiplier: speed });
    get().syncSnapshot();
  },

  setCameraMode: (cameraMode) => set({ cameraMode }),

  selectRobot: (selectedRobotId) => set({ selectedRobotId }),

  toggleSensors: () => set((s) => ({ showSensors: !s.showSensors })),

  togglePaths: () => set((s) => ({ showPaths: !s.showPaths })),

  toggleDebug: () => set((s) => ({ debugMode: !s.debugMode })),

  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  setArenaOpen: (arenaOpen) => set({ arenaOpen, comparisonOpen: false }),

  setComparisonOpen: (comparisonOpen) => {
    if (comparisonOpen && !get().comparisonResults) {
      get().runComparisonSuite();
    }
    set({ comparisonOpen, arenaOpen: false });
  },

  setInjectMenuOpen: (injectMenuOpen) => set({ injectMenuOpen }),

  setInspectedEvent: (inspectedEvent) => set({ inspectedEvent }),

  injectChallenge: (type) => {
    simulation.injectChallenge(type);
    set({ injectMenuOpen: false });
    get().syncSnapshot();
  },

  runComparisonSuite: () => {
    const compareIds: ScenarioId[] = [
      'baseline',
      'monsoonMud',
      'tractorCrossing',
      'chargerFailure',
      'communicationLoss',
    ];

    const results: ComparisonResultEntry[] = compareIds.map((id) => {
      const sim = new AgroSwarmSimulation(id);
      sim.startMission();
      for (let i = 0; i < 4200; i++) {
        sim.step(0.033);
        if (sim.world.phase === 'completed') break;
      }
      const w = sim.world;
      const m = w.metrics;
      const def = getScenarioDefinition(id);
      return {
        id,
        label: def.name,
        completionRate: Number(m.taskCompletionRate.toFixed(1)),
        energyConsumed: Number(m.energyConsumed.toFixed(1)),
        durationSec: Number(m.missionDuration.toFixed(1)),
        safetyEvents: m.avoidanceEvents + m.safetyStops + m.collisionEvents + m.safetyViolations,
        recoveryEvents:
          m.routeReplans +
          m.taskReassignments +
          m.deadlockRecoveries +
          m.relocalizationEvents,
        totalScore: w.scoreReport?.totalScore ?? 0,
      };
    });

    set({ comparisonResults: results });
  },
}));
