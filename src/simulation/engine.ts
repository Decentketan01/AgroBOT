import { findAStarPath, gridToWorld, worldToGrid } from './pathfinding';
import { SeededRNG } from './rng';
import { applyDisturbance, updateDisturbances } from './scenarios/disturbanceManager';
import { evaluateScenarioDirector } from './scenarios/scenarioDirector';
import { getScenarioDefinition } from './scenarios/scenarioRegistry';
import { computeScenarioScore } from './scenarios/scenarioScoring';
import { DisturbanceType } from './scenarios/scenarioTypes';
import {
  ChargingStation,
  CropNode,
  ObservationEntry,
  RobotAgent,
  ScenarioId,
  SimEvent,
  SimEventCategory,
  SimEventSeverity,
  Vec2,
  WorldState,
} from './types';
import {
  CELL_SIZE,
  createFieldCrops,
  createMovingObstacles,
  FIELD_HALF_SIZE,
  GRID_SIZE,
  ROBOT_START_SPECS,
  STATION_SPECS,
} from './worldConfig';

const HARVEST_RATE_PER_SEC = 0.65;
const CHARGE_RATE_PER_SEC = 18.5;
const BATTERY_LOW_THRESHOLD = 23.0;
const BATTERY_RESUME_THRESHOLD = 95.0;
const BASE_SENSOR_RADIUS = 9.0;
const LEASE_TTL_SEC = 14.0;

function dist2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class AgroSwarmSimulation {
  public world: WorldState;
  private rng: SeededRNG;
  private eventSeq = 1;
  private lastSampleTime = -1;
  private avoidanceCooldowns = new Map<string, number>();
  private collisionCooldowns = new Map<string, number>();
  private safetyViolationCooldowns = new Map<string, number>();
  private replanCooldowns = new Map<string, number>();
  private lastStopLogTime = new Map<string, number>();

  constructor(scenario: ScenarioId = 'showcase') {
    const def = getScenarioDefinition(scenario);
    this.rng = new SeededRNG(def.seed);
    this.world = this.buildInitialWorld(scenario);
  }

  public reset(scenario: ScenarioId): void {
    const def = getScenarioDefinition(scenario);
    this.rng = new SeededRNG(def.seed);
    this.eventSeq = 1;
    this.lastSampleTime = -1;
    this.avoidanceCooldowns.clear();
    this.collisionCooldowns.clear();
    this.safetyViolationCooldowns.clear();
    this.replanCooldowns.clear();
    this.lastStopLogTime.clear();
    this.world = this.buildInitialWorld(scenario);
  }

  private buildInitialWorld(scenario: ScenarioId): WorldState {
    const def = getScenarioDefinition(scenario);
    const crops = createFieldCrops(def.missingCropIndices ?? [], def.criticalCropIndices ?? []);
    const viableCrops = crops.filter((c) => !c.isMissing).length;
    const obstacles = createMovingObstacles(def.obstacleSpeedScale);

    if (scenario === 'showcase') {
      obstacles[0].position = { x: -17, z: -5.5 };
      obstacles[0].waypoints = [
        { x: -17, z: -5.5 },
        { x: 17, z: -5.5 },
        { x: 17, z: 9.5 },
        { x: -17, z: 9.5 },
      ];
      obstacles[0].currentWaypointIndex = 1;
    }

    const stations: ChargingStation[] = STATION_SPECS.map((s) => ({
      ...s,
      occupiedBy: null,
      queue: [],
      totalCharges: 0,
      powerDelivered: 0,
      offline: false,
      offlineUntil: null,
    }));

    const robots: RobotAgent[] = ROBOT_START_SPECS.slice(0, def.robotCount).map((spec, i) => ({
      id: spec.id,
      name: spec.name,
      callsign: spec.callsign,
      accentColor: spec.accentColor,
      position: { ...spec.position },
      heading: spec.heading,
      speed: 0,
      maxSpeed: 3.85 + (i === 0 ? 0.15 : 0),
      wheelRotation: 0,
      steeringAngle: 0,
      battery: def.robotBatteries[i] ?? 92,
      sensorRadius: BASE_SENSOR_RADIUS,
      effectiveSensorRadius: BASE_SENSOR_RADIUS,
      state: 'IDLE',
      objective: 'Standby on southern solar apron',
      decisionReason: 'Awaiting mission launch command',
      observations: [],
      path: [],
      targetPos: null,
      targetCropId: null,
      targetStationId: null,
      cropsHarvested: 0,
      distanceTraveled: 0,
      energyConsumed: 0,
      stuckTimer: 0,
      lastProgressPos: { ...spec.position },
      avoidanceTimer: 0,
      avoidanceDir: null,
      recoveryTimer: 0,
      harvestBeat: 0,
      localizationConfidence: 1.0,
      positionDrift: { x: 0, z: 0 },
      perceptionConfidence: 1.0,
      commOnline: true,
      relocalizeTimer: 0,
      reobserveTimer: 0,
      safetyStopReason: null,
      chargingWaitTimer: 0,
      localClaimMemory: {},
    }));

    const world: WorldState = {
      scenario,
      seed: def.seed,
      phase: 'briefing',
      simTime: 0,
      speedMultiplier: 1,
      gridCols: GRID_SIZE,
      gridRows: GRID_SIZE,
      cellSize: CELL_SIZE,
      fieldHalfSize: FIELD_HALF_SIZE,
      exploredGrid: new Uint8Array(GRID_SIZE * GRID_SIZE),
      blockedGrid: new Uint8Array(GRID_SIZE * GRID_SIZE),
      terrainCostGrid: new Float32Array(GRID_SIZE * GRID_SIZE).fill(1.0),
      crops,
      robots,
      stations,
      obstacles,
      humans: [],
      hazardZones: [],
      staticObstacles: [],
      rainIntensity: 0,
      dustIntensity: 0,
      groundWetness: 0,
      deadlineSec: def.deadlineSec ?? null,
      firedTriggerIds: [],
      events: [],
      energyHistory: [],
      metrics: {
        totalCrops: crops.length,
        viableCrops,
        cropsHarvested: 0,
        cropsRemaining: viableCrops,
        discoveredCrops: 0,
        missionDuration: 0,
        energyConsumed: 0,
        averageBattery: 0,
        chargingEvents: 0,
        taskCompletionRate: 0,
        collisionEvents: 0,
        nearCollisions: 0,
        avoidanceEvents: 0,
        safetyViolations: 0,
        safetyStops: 0,
        routeReplans: 0,
        chargingWaitTime: 0,
        taskReassignments: 0,
        deadlockRecoveries: 0,
        relocalizationEvents: 0,
        reobservationChecks: 0,
        droppedMessages: 0,
        emptySpotsVerified: 0,
        exploredPercent: 0,
      },
      activeCue: null,
      requestedCameraMode: null,
      missionOutcome: 'pending',
      outcomeReason: '',
      scoreReport: null,
      harvestParticlesTrigger: [],
    };

    for (const distType of def.initialDisturbances) {
      applyDisturbance(world, distType, this.logEvent.bind(this), undefined, false);
    }

    this.refreshNavigationGrids(world);
    for (const robot of world.robots) {
      this.scanEnvironment(world, robot);
    }
    this.updateMetrics(world);
    this.recordSample(world);
    this.logEvent(
      world,
      'EVENT',
      'info',
      'ARENA',
      `Scenario "${def.name}" staged (Seed ${def.seed}).`,
      `Initialized ${viableCrops} viable crops across 3 blocks with ${robots.length} autonomous units.`,
      { scenario: def.name, seed: def.seed }
    );

    return world;
  }

  public startMission(): void {
    if (this.world.phase === 'completed') {
      this.reset(this.world.scenario);
    }
    this.world.phase = 'running';
    const def = getScenarioDefinition(this.world.scenario);
    this.logEvent(
      this.world,
      'EVENT',
      'action',
      'MISSION',
      `Mission started: ${def.name}.`,
      'Swarm agents switched to autonomous task bidding, A* navigation, and continuous hazard monitoring.'
    );
  }

  public pause(): void {
    if (this.world.phase === 'running') {
      this.world.phase = 'paused';
      this.logEvent(
        this.world,
        'EVENT',
        'info',
        'CONTROL',
        'Simulation paused by operator.',
        'All robot kinematics and environmental triggers frozen cleanly.'
      );
    }
  }

  public resume(): void {
    if (this.world.phase === 'paused') {
      this.world.phase = 'running';
      this.logEvent(
        this.world,
        'EVENT',
        'info',
        'CONTROL',
        'Simulation resumed.',
        'Autonomous swarm simulation loop resumed.'
      );
    }
  }

  public setSpeed(speed: 1 | 2 | 4): void {
    this.world.speedMultiplier = speed;
  }

  public injectChallenge(type: DisturbanceType): void {
    applyDisturbance(this.world, type, this.logEvent.bind(this), undefined, true);
    this.refreshNavigationGrids(this.world);
    // Prompt moving robots to inspect new hazard & replan if needed
    for (const r of this.world.robots) {
      if (r.state === 'MOVING' && r.targetPos) {
        r.path = findAStarPath(
          r.position,
          r.targetPos,
          this.world.blockedGrid,
          this.world.terrainCostGrid
        );
        this.world.metrics.routeReplans++;
      }
    }
  }

  public step(rawDt: number): void {
    if (this.world.phase !== 'running') return;

    const clampedDt = Math.min(rawDt, 0.05);
    const totalSimDt = clampedDt * this.world.speedMultiplier;
    const subSteps = this.world.speedMultiplier === 4 ? 4 : this.world.speedMultiplier === 2 ? 2 : 1;
    const dt = totalSimDt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.stepSub(dt);
      if (this.world.phase !== 'running') break;
    }
  }

  private stepSub(dt: number): void {
    const world = this.world;
    world.simTime += dt;

    if (world.harvestParticlesTrigger.length > 0) {
      world.harvestParticlesTrigger = world.harvestParticlesTrigger.filter(
        (p) => world.simTime - p.time < 1.6
      );
    }

    if (world.activeCue && world.simTime - world.activeCue.time > 7.5) {
      world.activeCue = null;
    }

    // 1. Evaluate Scenario Director (time/condition triggers)
    evaluateScenarioDirector(world, this.logEvent.bind(this));

    // 2. Update dynamic disturbances & human workers
    updateDisturbances(world, dt, this.logEvent.bind(this));

    // 3. Advance moving farm machinery
    this.updateObstacles(world, dt);

    // 4. Refresh A* blocked + terrain cost grids
    this.refreshNavigationGrids(world);

    // 5. Expire stale task leases during communication outages
    this.expireStaleLeases(world);

    // 6. Scan local observations & environmental effects (canopy GPS, dust, comm)
    for (const robot of world.robots) {
      this.updateRobotEnvironmentStatus(world, robot, dt);
      this.scanEnvironment(world, robot);
    }

    // 7. Update autonomous robot FSMs
    for (const robot of world.robots) {
      this.updateRobotFSM(world, robot, dt);
    }

    // 8. Check collisions & human safety perimeters honestly
    this.checkCollisionsAndSafety(world);

    // 9. Update metrics & samples
    this.updateMetrics(world);
    if (world.simTime - this.lastSampleTime >= 1.5) {
      this.recordSample(world);
    }

    // 10. Check mission end conditions
    const remaining = world.crops.filter((c) => !c.harvested).length;
    const allDead = world.robots.every((r) => r.battery <= 0.1 && r.state !== 'CHARGING');
    const deadlineExceeded =
      world.deadlineSec !== null && world.simTime >= world.deadlineSec;

    if (remaining === 0 || allDead || deadlineExceeded) {
      world.phase = 'completed';
      for (const r of world.robots) {
        r.speed = 0;
        r.state = 'IDLE';
        r.path = [];
      }

      if (remaining === 0) {
        world.missionOutcome = 'complete';
        world.outcomeReason = `All ${world.metrics.viableCrops} viable field crops harvested safely in ${world.simTime.toFixed(1)}s.`;
        this.logEvent(
          world,
          'EVENT',
          'success',
          'MISSION',
          `Harvest complete: ${world.metrics.cropsHarvested}/${world.metrics.viableCrops} crops secured.`,
          'All reachable viable crops verified harvested; final scenario score computed.'
        );
      } else if (deadlineExceeded) {
        world.missionOutcome = 'incomplete';
        world.outcomeReason = `Weather deadline (${world.deadlineSec}s) reached with ${remaining} crops remaining.`;
        this.logEvent(
          world,
          'EVENT',
          'warning',
          'STORM-FRONT',
          `Storm deadline reached — ${world.metrics.cropsHarvested}/${world.metrics.viableCrops} harvested.`,
          'Mission halted at storm arrival boundary; score reflects partial yield and safety performance.'
        );
      } else {
        world.missionOutcome = 'incomplete';
        world.outcomeReason = `Fleet battery exhausted with ${remaining} crops remaining.`;
      }

      this.updateMetrics(world);
      this.recordSample(world);
      world.scoreReport = computeScenarioScore(world);
    }
  }

  private expireStaleLeases(world: WorldState): void {
    for (const crop of world.crops) {
      if (!crop.harvested && crop.claimedBy && crop.leaseExpiresAt > 0) {
        if (world.simTime > crop.leaseExpiresAt) {
          const prevOwner = crop.claimedBy;
          crop.claimedBy = null;
          crop.leaseExpiresAt = 0;
          world.metrics.taskReassignments++;
          this.logEvent(
            world,
            'RECOVERY',
            'info',
            'LEASE',
            `Lease expired for ${crop.id} (was ${prevOwner}) — task reopened.`,
            'Task lease timeout prevented permanently locked crops during communication drop or delay.'
          );
        }
      }
    }
  }

  private updateObstacles(world: WorldState, dt: number): void {
    for (const obs of world.obstacles) {
      obs.activeWarning = false;
      const target = obs.waypoints[obs.currentWaypointIndex];
      const dx = target.x - obs.position.x;
      const dz = target.z - obs.position.z;
      const d = Math.hypot(dx, dz);

      if (d < 0.35) {
        obs.currentWaypointIndex = (obs.currentWaypointIndex + 1) % obs.waypoints.length;
        continue;
      }

      const targetHeading = Math.atan2(dx, dz);
      const diff = normalizeAngle(targetHeading - obs.heading);
      obs.heading = normalizeAngle(obs.heading + diff * Math.min(1, dt * 6));

      const moveDist = Math.min(d, obs.speed * dt);
      obs.position.x += (dx / d) * moveDist;
      obs.position.z += (dz / d) * moveDist;
      obs.wheelRotation += moveDist * 1.6;
    }
  }

  private refreshNavigationGrids(world: WorldState): void {
    world.blockedGrid.fill(0);
    world.terrainCostGrid.fill(1.0);

    // Outer perimeter fence buffer
    for (let i = 0; i < GRID_SIZE; i++) {
      world.blockedGrid[i] = 1;
      world.blockedGrid[(GRID_SIZE - 1) * GRID_SIZE + i] = 1;
      world.blockedGrid[i * GRID_SIZE] = 1;
      world.blockedGrid[i * GRID_SIZE + (GRID_SIZE - 1)] = 1;
    }

    // Dynamic moving obstacles
    for (const obs of world.obstacles) {
      const centers: Vec2[] = [
        obs.position,
        {
          x: obs.position.x + Math.sin(obs.heading) * 1.4,
          z: obs.position.z + Math.cos(obs.heading) * 1.4,
        },
      ];
      for (const center of centers) {
        const g = worldToGrid(center);
        const radCells = Math.ceil(obs.radius);
        for (let dr = -radCells; dr <= radCells; dr++) {
          for (let dc = -radCells; dc <= radCells; dc++) {
            const nc = g.col + dc;
            const nr = g.row + dr;
            if (nc > 0 && nc < GRID_SIZE - 1 && nr > 0 && nr < GRID_SIZE - 1) {
              if (Math.hypot(dc, dr) <= obs.radius + 0.35) {
                world.blockedGrid[nr * GRID_SIZE + nc] = 1;
              }
            }
          }
        }
      }
    }

    // Static row obstacles (crates / irrigation pipes)
    for (const stObs of world.staticObstacles) {
      const g = worldToGrid(stObs.position);
      const radCells = Math.ceil(stObs.radius);
      for (let dr = -radCells; dr <= radCells; dr++) {
        for (let dc = -radCells; dc <= radCells; dc++) {
          const nc = g.col + dc;
          const nr = g.row + dr;
          if (nc > 0 && nc < GRID_SIZE - 1 && nr > 0 && nr < GRID_SIZE - 1) {
            if (Math.hypot(dc, dr) <= stObs.radius + 0.2) {
              world.blockedGrid[nr * GRID_SIZE + nc] = 1;
            }
          }
        }
      }
    }

    // Terrain cost zones (Mud, Slopes, Waterlogging)
    for (const hz of world.hazardZones) {
      if (hz.kind !== 'mud' && hz.kind !== 'slope' && hz.kind !== 'waterlog') continue;
      const g = worldToGrid(hz.position);
      const radCells = Math.ceil(hz.radius);
      for (let dr = -radCells; dr <= radCells; dr++) {
        for (let dc = -radCells; dc <= radCells; dc++) {
          const nc = g.col + dc;
          const nr = g.row + dr;
          if (nc > 0 && nc < GRID_SIZE - 1 && nr > 0 && nr < GRID_SIZE - 1) {
            if (Math.hypot(dc, dr) <= hz.radius) {
              const idx = nr * GRID_SIZE + nc;
              if (hz.unsafe) {
                world.terrainCostGrid[idx] = Math.max(world.terrainCostGrid[idx], 8.5);
              } else if (hz.kind === 'mud') {
                world.terrainCostGrid[idx] = Math.max(world.terrainCostGrid[idx], 3.4);
              } else {
                world.terrainCostGrid[idx] = Math.max(world.terrainCostGrid[idx], 2.5);
              }
            }
          }
        }
      }
    }
  }

  private getRobotTerrainEffects(
    world: WorldState,
    pos: Vec2
  ): { traction: number; energyMult: number; sensorScale: number; inCanopy: boolean; commBlocked: boolean } {
    let traction = 1.0;
    let energyMult = 1.0;
    let sensorScale = 1.0;
    let inCanopy = false;
    let commBlocked = false;

    for (const hz of world.hazardZones) {
      if (dist2(pos, hz.position) <= hz.radius) {
        traction = Math.min(traction, hz.tractionFactor);
        energyMult = Math.max(energyMult, hz.energyMultiplier);
        sensorScale = Math.min(sensorScale, hz.sensorScale);
        if (hz.gpsConfidenceDrop > 0) inCanopy = true;
        if (hz.commBlocked) commBlocked = true;
      }
    }

    if (world.rainIntensity > 0.3) {
      traction = Math.min(traction, 0.85);
      energyMult = Math.max(energyMult, 1.15);
    }

    return { traction, energyMult, sensorScale, inCanopy, commBlocked };
  }

  private updateRobotEnvironmentStatus(
    world: WorldState,
    robot: RobotAgent,
    dt: number
  ): void {
    const fx = this.getRobotTerrainEffects(world, robot.position);
    robot.effectiveSensorRadius = robot.sensorRadius * fx.sensorScale;
    robot.perceptionConfidence = fx.sensorScale;

    // Communication black spot tracking
    const wasOnline = robot.commOnline;
    robot.commOnline = !fx.commBlocked;
    if (wasOnline && !robot.commOnline) {
      world.metrics.droppedMessages++;
      this.logEvent(
        world,
        'COORDINATION',
        'warning',
        robot.id,
        `${robot.id} entered RF black spot — switching to local lease autonomy.`,
        'Inter-robot broadcasts dropped in black spot; agent respects active task leases until expiry.'
      );
    } else if (!wasOnline && robot.commOnline) {
      this.logEvent(
        world,
        'COORDINATION',
        'success',
        robot.id,
        `${robot.id} reconnected — reconciling local crop memory.`,
        'Exited RF black spot and synchronized local harvested/claimed state with peer robots.'
      );
    }

    // Simulated GPS / localization confidence inside canopy
    if (fx.inCanopy) {
      robot.localizationConfidence = Math.max(0.28, robot.localizationConfidence - 0.14 * dt);
      robot.positionDrift.x += (this.rng.next() - 0.5) * 0.08 * dt;
      robot.positionDrift.z += (this.rng.next() - 0.5) * 0.08 * dt;
    } else {
      robot.localizationConfidence = Math.min(1.0, robot.localizationConfidence + 0.25 * dt);
      robot.positionDrift.x *= 0.9;
      robot.positionDrift.z *= 0.9;
    }

    // Trigger controlled relocalization if simulated confidence drops too low
    if (
      robot.localizationConfidence < 0.48 &&
      robot.state !== 'RELOCALIZING' &&
      robot.state !== 'CHARGING' &&
      robot.state !== 'SAFETY_STOP'
    ) {
      robot.state = 'RELOCALIZING';
      robot.relocalizeTimer = 1.4;
      robot.speed = 0;
      world.metrics.relocalizationEvents++;
      robot.decisionReason =
        'Simulated localization confidence < 48% under canopy — running odometry & landmark relocalization.';
      this.logEvent(
        world,
        'RECOVERY',
        'warning',
        robot.id,
        `${robot.id} relocalizing via simulated local landmarks.`,
        'Canopy GPS attenuation reduced simulated confidence; robot halted briefly to anchor odometry to field landmarks.',
        { confidence: `${Math.round(robot.localizationConfidence * 100)}%` }
      );
    }
  }

  private scanEnvironment(world: WorldState, robot: RobotAgent): void {
    const rGrid = worldToGrid(robot.position);
    const scanRad = robot.effectiveSensorRadius;
    const cellRadius = Math.ceil(scanRad / CELL_SIZE);

    for (let dr = -cellRadius; dr <= cellRadius; dr++) {
      for (let dc = -cellRadius; dc <= cellRadius; dc++) {
        const nc = rGrid.col + dc;
        const nr = rGrid.row + dr;
        if (nc >= 0 && nc < GRID_SIZE && nr >= 0 && nr < GRID_SIZE) {
          if (Math.hypot(dc, dr) * CELL_SIZE <= scanRad) {
            world.exploredGrid[nr * GRID_SIZE + nc] = 1;
          }
        }
      }
    }

    const observations: ObservationEntry[] = [];

    // Discover crops (and verify missing spots!)
    for (const crop of world.crops) {
      const d = dist2(robot.position, crop.position);
      if (d <= scanRad) {
        if (crop.isMissing && !crop.verifiedEmpty && d <= 4.2) {
          crop.verifiedEmpty = true;
          crop.discovered = true;
          world.metrics.emptySpotsVerified++;
          if (robot.targetCropId === crop.id) {
            robot.targetCropId = null;
            robot.state = 'IDLE';
          }
          this.logEvent(
            world,
            'PERCEPTION',
            'info',
            robot.id,
            `Verified empty planting slot at ${crop.id} — skipping & retargeting.`,
            'Close-range perception confirmed missing germination; robot updated swarm inventory without wasting harvest cycle.'
          );
          continue;
        }

        if (!crop.discovered) {
          crop.discovered = true;
          this.logEvent(
            world,
            'PERCEPTION',
            'info',
            robot.id,
            `Discovered ${crop.id} (${crop.cropType}${crop.priority === 'critical' ? ', URGENT' : ''}).`,
            `Sensor sweep inside ${crop.plotId} detected harvestable crop at ${d.toFixed(1)}m.`
          );
        }

        if (!crop.harvested) {
          observations.push({
            kind: 'crop',
            id: crop.id,
            label: `${crop.id} (${crop.cropType})`,
            distance: d,
            detail:
              robot.perceptionConfidence < 0.7 && d > 3.5
                ? 'Low-vis uncertain'
                : crop.claimedBy
                  ? `Claimed (${crop.claimedBy})`
                  : 'Available',
          });
        }
      }
    }

    // Observe humans
    for (const h of world.humans) {
      const d = dist2(robot.position, h.position);
      if (d <= scanRad + 2) {
        observations.push({
          kind: 'human',
          id: h.id,
          label: h.name,
          distance: d,
          detail: d <= h.safetyRadius + 0.8 ? 'SAFETY STOP ZONE' : 'Tracked worker',
        });
      }
    }

    // Observe moving obstacles
    for (const obs of world.obstacles) {
      const d = dist2(robot.position, obs.position);
      if (d <= scanRad) {
        observations.push({
          kind: 'obstacle',
          id: obs.id,
          label: obs.name,
          distance: d,
          detail: d < 4.5 ? 'Conflict Alert' : 'Tracked lane traffic',
        });
      }
    }

    // Observe active hazards
    for (const hz of world.hazardZones) {
      const d = dist2(robot.position, hz.position);
      if (d <= scanRad + hz.radius) {
        observations.push({
          kind: 'hazard',
          id: hz.id,
          label: hz.label,
          distance: Math.max(0, d - hz.radius),
          detail: hz.kind.toUpperCase(),
        });
      }
    }

    // Observe peers
    for (const peer of world.robots) {
      if (peer.id === robot.id) continue;
      const d = dist2(robot.position, peer.position);
      if (d <= scanRad) {
        observations.push({
          kind: 'robot',
          id: peer.id,
          label: peer.name,
          distance: d,
          detail: `${peer.state} · ${Math.round(peer.battery)}%`,
        });
      }
    }

    observations.sort((a, b) => a.distance - b.distance);
    robot.observations = observations.slice(0, 6);
  }

  private updateRobotFSM(world: WorldState, robot: RobotAgent, dt: number): void {
    // 0. Check Human Safety Zone FIRST (highest safety priority!)
    const nearbyHuman = world.humans.find(
      (h) => dist2(robot.position, h.position) <= h.safetyRadius + 0.75
    );
    if (nearbyHuman && robot.state !== 'CHARGING') {
      nearbyHuman.safetyStopTriggered = true;
      if (robot.state !== 'SAFETY_STOP') {
        robot.state = 'SAFETY_STOP';
        robot.speed = 0;
        robot.safetyStopReason = `${nearbyHuman.name} inside ${nearbyHuman.safetyRadius.toFixed(1)}m safety zone`;
        robot.objective = `SAFETY STOP (${nearbyHuman.name})`;
        robot.decisionReason = `Halted immediately: ${nearbyHuman.name} within ${nearbyHuman.safetyRadius.toFixed(1)}m exclusion radius.`;
        world.metrics.safetyStops++;

        const lastLog = this.lastStopLogTime.get(robot.id) ?? -99;
        if (world.simTime - lastLog > 3.5) {
          this.lastStopLogTime.set(robot.id, world.simTime);
          this.logEvent(
            world,
            'DECISION',
            'warning',
            robot.id,
            `${robot.id} activated SAFETY STOP for ${nearbyHuman.name}.`,
            'Human presence detected inside safety perimeter; all wheel drive motors locked to zero.',
            { safetyRadius: nearbyHuman.safetyRadius }
          );
          if (robot.commOnline) {
            this.logEvent(
              world,
              'COORDINATION',
              'info',
              robot.id,
              `Peer safety alert broadcast: worker crossing near (${nearbyHuman.position.x.toFixed(0)}, ${nearbyHuman.position.z.toFixed(0)}).`,
              'Nearby robots notified to maintain separation while worker crosses row.'
            );
          } else {
            world.metrics.droppedMessages++;
          }
        }
      }
      return;
    }

    // Resume from SAFETY_STOP once human clears
    if (robot.state === 'SAFETY_STOP') {
      robot.safetyStopReason = null;
      robot.state = robot.targetStationId
        ? 'RETURNING'
        : robot.targetCropId
          ? 'MOVING'
          : 'IDLE';
      robot.decisionReason = 'Safety zone clear — resuming autonomous operation.';
      this.logEvent(
        world,
        'RECOVERY',
        'success',
        robot.id,
        `${robot.id} resumed after worker cleared safety perimeter.`,
        'Separation restored above safety threshold; resuming prior route.'
      );
      if (robot.targetPos) {
        robot.path = findAStarPath(
          robot.position,
          robot.targetPos,
          world.blockedGrid,
          world.terrainCostGrid
        );
      }
      return;
    }

    // 1. RELOCALIZING state (Simulated GPS Canopy Recovery)
    if (robot.state === 'RELOCALIZING') {
      robot.speed = 0;
      robot.relocalizeTimer -= dt;
      if (robot.relocalizeTimer <= 0) {
        robot.localizationConfidence = 0.92;
        robot.positionDrift = { x: 0, z: 0 };
        robot.state = robot.targetStationId
          ? 'RETURNING'
          : robot.targetCropId
            ? 'MOVING'
            : 'IDLE';
        robot.decisionReason =
          'Simulated landmark relocalization complete (confidence 92%); resuming route.';
        this.logEvent(
          world,
          'RECOVERY',
          'success',
          robot.id,
          `${robot.id} relocalization complete (confidence 92%).`,
          'Local landmark alignment corrected simulated position drift inside canopy.'
        );
      }
      return;
    }

    // 2. CHARGING state
    if (robot.state === 'CHARGING') {
      robot.speed = 0;
      robot.steeringAngle = 0;
      const st = world.stations.find((s) => s.id === robot.targetStationId);
      if (!st || st.offline) {
        // Station failed mid-charge!
        this.releaseStation(world, robot);
        robot.state = 'IDLE';
        this.assignChargingStation(world, robot);
        return;
      }

      robot.battery = Math.min(100, robot.battery + CHARGE_RATE_PER_SEC * dt);
      st.powerDelivered += CHARGE_RATE_PER_SEC * dt;

      if (robot.battery >= BATTERY_RESUME_THRESHOLD) {
        this.releaseStation(world, robot);
        robot.state = 'IDLE';
        robot.objective = 'Recharged — bidding for next crop';
        robot.decisionReason = `Battery restored to ${Math.round(robot.battery)}%; rejoining harvest swarm.`;
        this.logEvent(
          world,
          'ENERGY',
          'success',
          robot.id,
          `Recharge complete (${Math.round(robot.battery)}%) — resuming tasks.`,
          'Solar dock charge threshold reached; bay released for queued teammates.'
        );
      }
      return;
    }

    // 3. Check obstacle avoidance threats during transit
    if (
      robot.state === 'MOVING' ||
      robot.state === 'EXPLORING' ||
      robot.state === 'RETURNING'
    ) {
      const threat = this.detectMovingThreat(world, robot);
      if (threat) {
        robot.state = 'AVOIDING';
        robot.avoidanceTimer = 1.0;
        robot.avoidanceDir = threat.evadeDir;
        robot.decisionReason = `Detected ${threat.label} at ${threat.dist.toFixed(1)}m — executing evasive maneuver.`;

        const pairKey = `${robot.id}:${threat.id}`;
        const lastLog = this.avoidanceCooldowns.get(pairKey) ?? -99;
        if (world.simTime - lastLog > 3.5) {
          this.avoidanceCooldowns.set(pairKey, world.simTime);
          world.metrics.avoidanceEvents++;
          world.metrics.nearCollisions++;
          this.logEvent(
            world,
            'PERCEPTION',
            'warning',
            robot.id,
            `Detected ${threat.label} at ${threat.dist.toFixed(1)}m — avoiding.`,
            'Forward LiDAR cone detected moving trajectory intersection; evasive steering engaged.',
            { distanceM: Number(threat.dist.toFixed(1)), target: threat.label }
          );
        }
        return;
      }
    }

    // 4. AVOIDING state
    if (robot.state === 'AVOIDING') {
      robot.avoidanceTimer -= dt;
      if (robot.avoidanceDir) {
        this.steerTowardDirection(world, robot, robot.avoidanceDir, 2.2, dt);
      }
      const stillThreat = this.detectMovingThreat(world, robot);
      if (!stillThreat && robot.avoidanceTimer <= 0) {
        world.metrics.routeReplans++;
        if (robot.targetStationId) {
          robot.state = 'RETURNING';
          this.planPathToStation(world, robot);
          robot.decisionReason = 'Conflict cleared — calculated alternate A* route to charger.';
        } else if (robot.targetCropId) {
          robot.state = 'MOVING';
          this.planPathToCrop(world, robot);
          robot.decisionReason = 'Obstacle cleared — alternative A* route calculated.';
        } else {
          robot.state = 'IDLE';
        }
        this.logEvent(
          world,
          'NAVIGATION',
          'action',
          robot.id,
          `${robot.id} calculated alternative A* route.`,
          'Cost-weighted A* planner computed updated collision-free path around dynamic machinery.'
        );
      } else if (stillThreat && robot.avoidanceTimer <= 0) {
        robot.avoidanceTimer = 0.65;
        robot.avoidanceDir = stillThreat.evadeDir;
      }
      return;
    }

    // 5. RECOVERING state (stuck / blocked row recovery)
    if (robot.state === 'RECOVERING') {
      robot.recoveryTimer -= dt;
      const backDir = {
        x: -Math.sin(robot.heading + 0.95),
        z: -Math.cos(robot.heading + 0.95),
      };
      this.steerTowardDirection(world, robot, backDir, 1.85, dt);

      if (robot.recoveryTimer <= 0) {
        robot.stuckTimer = 0;
        robot.lastProgressPos = { ...robot.position };
        if (robot.targetCropId) {
          const crop = world.crops.find((c) => c.id === robot.targetCropId);
          if (crop && crop.claimedBy === robot.id) {
            crop.claimedBy = null;
            crop.leaseExpiresAt = 0;
            crop.cooldownUntil = world.simTime + 3.0;
            world.metrics.taskReassignments++;
          }
          robot.targetCropId = null;
        }
        robot.targetPos = null;
        robot.path = [];
        robot.state = 'IDLE';
        robot.decisionReason =
          'Recovery maneuver complete — released blocked lease temporarily and re-bidding.';
        this.logEvent(
          world,
          'RECOVERY',
          'info',
          robot.id,
          `${robot.id} released blocked task lease & reset A* planner.`,
          'Temporary obstruction triggered backoff recovery and lease release without blacklisting reachable crops.'
        );
      }
      return;
    }

    // 6. HARVESTING state
    if (robot.state === 'HARVESTING') {
      robot.speed = 0;
      robot.steeringAngle = 0;
      robot.harvestBeat += dt * 10;

      const crop = world.crops.find((c) => c.id === robot.targetCropId);
      if (!crop || crop.harvested) {
        robot.targetCropId = null;
        robot.state = 'IDLE';
        return;
      }

      // Dust low-visibility re-observation pause
      if (robot.perceptionConfidence < 0.7 && robot.reobserveTimer > 0) {
        robot.reobserveTimer -= dt;
        robot.decisionReason = 'Low visibility — re-observing crop target before cutting.';
        return;
      }

      const targetHeading = Math.atan2(
        crop.position.x - robot.position.x,
        crop.position.z - robot.position.z
      );
      const diff = normalizeAngle(targetHeading - robot.heading);
      robot.heading = normalizeAngle(robot.heading + diff * Math.min(1, dt * 8));

      crop.harvestProgress = Math.min(1, crop.harvestProgress + HARVEST_RATE_PER_SEC * dt);
      const drain = 1.45 * dt;
      robot.battery = Math.max(0, robot.battery - drain);
      robot.energyConsumed += drain;

      if (crop.harvestProgress >= 1) {
        crop.harvested = true;
        crop.claimedBy = null;
        crop.leaseExpiresAt = 0;
        robot.cropsHarvested++;
        robot.localClaimMemory[crop.id] = world.simTime;
        robot.targetCropId = null;
        robot.targetPos = null;
        robot.path = [];
        world.harvestParticlesTrigger.push({
          id: `${crop.id}-${world.simTime}`,
          position: { ...crop.position },
          cropType: crop.cropType,
          time: world.simTime,
        });
        this.logEvent(
          world,
          'DECISION',
          'success',
          robot.id,
          `Harvested ${crop.id} (${crop.cropType}, +${crop.yieldKg}kg).`,
          `Completed harvest cycle; evaluating battery reserve (${Math.round(robot.battery)}%) and next crop utility.`
        );
        robot.state = 'IDLE';
        robot.decisionReason = `Completed ${crop.id}; evaluating battery & next utility bid.`;
      }
      return;
    }

    // 7. Battery threshold check
    if (robot.state !== 'RETURNING' && robot.battery <= BATTERY_LOW_THRESHOLD) {
      this.abortCropClaim(world, robot);
      this.assignChargingStation(world, robot);
      return;
    }

    // 8. IDLE -> Select next task
    if (robot.state === 'IDLE') {
      this.selectNextTask(world, robot);
      return;
    }

    // 9. RETURNING -> Navigate to charging dock or priority queue
    if (robot.state === 'RETURNING') {
      let station = world.stations.find((s) => s.id === robot.targetStationId);
      if (!station || station.offline) {
        this.releaseStation(world, robot);
        this.assignChargingStation(world, robot);
        return;
      }

      // Check if an open station became available while waiting
      if (station.occupiedBy && station.occupiedBy !== robot.id) {
        const freeStation = world.stations.find(
          (s) => !s.offline && !s.occupiedBy && s.queue.length === 0
        );
        if (freeStation) {
          station.queue = station.queue.filter((id) => id !== robot.id);
          robot.targetStationId = freeStation.id;
          freeStation.occupiedBy = robot.id;
          station = freeStation;
          this.planPathToStation(world, robot);
          robot.decisionReason = `Switched to open ${freeStation.name} to eliminate wait time.`;
          this.logEvent(
            world,
            'ENERGY',
            'action',
            robot.id,
            `${robot.id} switching charging destination to open ${freeStation.name}.`,
            'Dynamic charger reassessment eliminated unnecessary queue wait.'
          );
        }
      }

      // Priority queue sorting: lowest battery robot gets bay first when bay opens!
      if (!station.occupiedBy && station.queue.length > 0) {
        station.queue.sort((idA, idB) => {
          const rA = world.robots.find((r) => r.id === idA);
          const rB = world.robots.find((r) => r.id === idB);
          return (rA?.battery ?? 100) - (rB?.battery ?? 100);
        });
        if (station.queue[0] === robot.id) {
          station.occupiedBy = robot.id;
          station.queue.shift();
          robot.targetPos = { ...station.position };
          this.planPathToStation(world, robot);
          robot.objective = `Docking at ${station.name}`;
        }
      }

      const isBayOwner = station.occupiedBy === robot.id;
      const goal = isBayOwner ? station.position : this.getQueueStandbyPos(station, robot.id);
      const distGoal = dist2(robot.position, goal);

      if (isBayOwner && distGoal < 0.85) {
        robot.position = { ...station.position };
        robot.speed = 0;
        robot.state = 'CHARGING';
        station.totalCharges++;
        world.metrics.chargingEvents++;
        robot.objective = `Charging at ${station.name}`;
        robot.decisionReason = `Docked at ${station.name} (${Math.round(robot.battery)}%); fast-charging to ${BATTERY_RESUME_THRESHOLD}%.`;
        this.logEvent(
          world,
          'ENERGY',
          'action',
          robot.id,
          `${robot.id} docked at ${station.name} (${Math.round(robot.battery)}% remaining).`,
          'Charging bay capacity locked to single unit while replenishing cells.'
        );
        return;
      }

      if (!isBayOwner && distGoal < 0.95) {
        robot.speed = 0;
        robot.steeringAngle = 0;
        robot.chargingWaitTimer += dt;
        world.metrics.chargingWaitTime += dt;
        robot.objective = `Priority Queue at ${station.name}`;
        robot.decisionReason = `Station busy (${station.occupiedBy}) — holding standby priority queue.`;
        return;
      }

      this.followPath(world, robot, goal, dt, false);
      return;
    }

    // 10. MOVING -> Navigate A* path to claimed crop
    if (robot.state === 'MOVING') {
      const crop = world.crops.find((c) => c.id === robot.targetCropId);
      if (!crop || crop.harvested) {
        robot.targetCropId = null;
        robot.state = 'IDLE';
        return;
      }

      const dCrop = dist2(robot.position, crop.position);
      if (dCrop < 0.85) {
        robot.state = 'HARVESTING';
        robot.speed = 0;
        if (robot.perceptionConfidence < 0.7) {
          robot.reobserveTimer = 0.65;
          world.metrics.reobservationChecks++;
          this.logEvent(
            world,
            'PERCEPTION',
            'info',
            robot.id,
            `${robot.id} re-observing ${crop.id} in poor dust visibility.`,
            'Low perception confidence triggered short target verification before engaging cutter.'
          );
        }
        robot.objective = `Harvesting ${crop.id} (${crop.cropType})`;
        robot.decisionReason = `Arrived at ${crop.id}; engaging rotary cutter head.`;
        return;
      }

      this.followPath(world, robot, crop.position, dt, true);
      return;
    }

    // 11. EXPLORING -> Frontier exploration
    if (robot.state === 'EXPLORING') {
      const candidate = this.findBestCropBid(world, robot);
      if (candidate) {
        this.claimAndMoveToCrop(world, robot, candidate.crop, candidate.reason);
        return;
      }

      if (!robot.targetPos || dist2(robot.position, robot.targetPos) < 1.35) {
        robot.state = 'IDLE';
        return;
      }

      this.followPath(world, robot, robot.targetPos, dt, false);
    }
  }

  private selectNextTask(world: WorldState, robot: RobotAgent): void {
    const nearestStation = this.getBestStation(world, robot);
    if (nearestStation) {
      const distToStation = dist2(robot.position, nearestStation.position);
      const minSafeBattery = 15.0 + distToStation * 0.52;
      if (robot.battery <= Math.max(BATTERY_LOW_THRESHOLD, minSafeBattery)) {
        this.assignChargingStation(world, robot);
        return;
      }
    }

    const bestBid = this.findBestCropBid(world, robot);
    if (bestBid) {
      this.claimAndMoveToCrop(world, robot, bestBid.crop, bestBid.reason);
      return;
    }

    if (robot.battery < 50 && world.crops.some((c) => !c.harvested)) {
      this.assignChargingStation(world, robot);
      return;
    }

    const frontier = this.findFrontierTarget(world, robot);
    if (frontier) {
      robot.state = 'EXPLORING';
      robot.targetPos = frontier;
      robot.path = findAStarPath(
        robot.position,
        frontier,
        world.blockedGrid,
        world.terrainCostGrid
      );
      robot.objective = `Scanning sector (${frontier.x.toFixed(0)}, ${frontier.z.toFixed(0)})`;
      robot.decisionReason =
        'No unclaimed discovered crops — dispatching to nearest unexplored grid frontier.';
      return;
    }

    const anyRemaining = world.crops.find(
      (c) => !c.harvested && !c.claimedBy && world.simTime >= c.cooldownUntil
    );
    if (anyRemaining) {
      anyRemaining.discovered = true;
      this.claimAndMoveToCrop(
        world,
        robot,
        anyRemaining,
        `Final sweep assignment to ${anyRemaining.id}.`
      );
      return;
    }

    robot.speed = 0;
    robot.objective = 'Holding position — peers completing final crops';
    robot.decisionReason = 'All remaining crops are actively claimed by peer harvesters.';
  }

  private findBestCropBid(
    world: WorldState,
    robot: RobotAgent
  ): { crop: CropNode; score: number; reason: string } | null {
    let best: { crop: CropNode; score: number; reason: string } | null = null;
    const nearestSt = this.getBestStation(world, robot);
    const fx = this.getRobotTerrainEffects(world, robot.position);

    for (const crop of world.crops) {
      if (crop.harvested || !crop.discovered || crop.isMissing) continue;
      if (crop.claimedBy && crop.claimedBy !== robot.id) continue;
      if (world.simTime < crop.cooldownUntil) continue;

      // In comm outage, avoid targets we recently saw peers claim
      const dCrop = dist2(robot.position, crop.position);
      const dReturn = nearestSt ? dist2(crop.position, nearestSt.position) : 20;

      const energyMult = Math.max(fx.energyMult, world.groundWetness > 0.4 ? 1.35 : 1.0);
      const estEnergyRequired = (dCrop * 0.48 + 2.5 + dReturn * 0.48) * energyMult + 13.5;
      if (robot.battery < estEnergyRequired) continue;

      const angleToCrop = Math.atan2(
        crop.position.x - robot.position.x,
        crop.position.z - robot.position.z
      );
      const turnPenalty = Math.abs(normalizeAngle(angleToCrop - robot.heading)) * 1.4;

      let peerPenalty = 0;
      if (robot.commOnline) {
        for (const peer of world.robots) {
          if (peer.id === robot.id) continue;
          if (dist2(peer.position, crop.position) < dCrop * 0.85) {
            peerPenalty += 3.5;
          }
        }
      }

      // Check terrain cost at crop cell
      const cg = worldToGrid(crop.position);
      const terrainPenalty = (world.terrainCostGrid[cg.row * GRID_SIZE + cg.col] - 1.0) * 2.5;
      const urgencyBonus = crop.priority === 'critical' ? -7.5 : 0;

      const score = dCrop + turnPenalty + peerPenalty + terrainPenalty + urgencyBonus;
      if (!best || score < best.score) {
        best = {
          crop,
          score,
          reason: `Won bid for ${crop.id}${crop.priority === 'critical' ? ' [URGENT]' : ''} (dist ${dCrop.toFixed(1)}m, cost ${score.toFixed(1)}, reserve OK).`,
        };
      }
    }

    return best;
  }

  private claimAndMoveToCrop(
    world: WorldState,
    robot: RobotAgent,
    crop: CropNode,
    reason: string
  ): void {
    if (crop.claimedBy && crop.claimedBy !== robot.id) return;
    this.abortCropClaim(world, robot);

    crop.claimedBy = robot.id;
    crop.leaseExpiresAt = world.simTime + LEASE_TTL_SEC;
    robot.targetCropId = crop.id;
    robot.targetPos = { ...crop.position };
    robot.state = 'MOVING';
    robot.objective = `Harvest ${crop.id} (${crop.cropType})`;
    robot.decisionReason = reason;
    robot.stuckTimer = 0;
    robot.lastProgressPos = { ...robot.position };
    this.planPathToCrop(world, robot);
  }

  private planPathToCrop(world: WorldState, robot: RobotAgent): void {
    const crop = world.crops.find((c) => c.id === robot.targetCropId);
    if (!crop) return;
    robot.path = findAStarPath(
      robot.position,
      crop.position,
      world.blockedGrid,
      world.terrainCostGrid
    );
  }

  private planPathToStation(world: WorldState, robot: RobotAgent): void {
    const st = world.stations.find((s) => s.id === robot.targetStationId);
    if (!st) return;
    const target =
      st.occupiedBy === robot.id ? st.position : this.getQueueStandbyPos(st, robot.id);
    robot.path = findAStarPath(
      robot.position,
      target,
      world.blockedGrid,
      world.terrainCostGrid
    );
  }

  private abortCropClaim(world: WorldState, robot: RobotAgent): void {
    if (!robot.targetCropId) return;
    const prev = world.crops.find((c) => c.id === robot.targetCropId);
    if (prev && prev.claimedBy === robot.id) {
      prev.claimedBy = null;
      prev.leaseExpiresAt = 0;
    }
    robot.targetCropId = null;
  }

  private getBestStation(
    world: WorldState,
    robot: RobotAgent,
    fromPos: Vec2 = robot.position
  ): ChargingStation | null {
    const onlineStations = world.stations.filter((s) => !s.offline);
    const pool = onlineStations.length > 0 ? onlineStations : world.stations;

    let best = pool[0] ?? null;
    let bestScore = Infinity;

    for (const st of pool) {
      const d = dist2(fromPos, st.position);
      const queuePenalty =
        (st.occupiedBy && st.occupiedBy !== robot.id ? 14 : 0) + st.queue.length * 10;
      const score = d + queuePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = st;
      }
    }
    return best;
  }

  private assignChargingStation(world: WorldState, robot: RobotAgent): void {
    const station = this.getBestStation(world, robot);
    if (!station) return;

    robot.targetStationId = station.id;
    robot.state = 'RETURNING';
    robot.stuckTimer = 0;
    robot.lastProgressPos = { ...robot.position };

    if (!station.occupiedBy && station.queue.length === 0) {
      station.occupiedBy = robot.id;
      robot.objective = `Returning to ${station.name}`;
      robot.decisionReason = `Battery ${Math.round(robot.battery)}% — routing to open ${station.name}.`;
      this.logEvent(
        world,
        'ENERGY',
        'warning',
        robot.id,
        `${robot.id} low battery (${Math.round(robot.battery)}%) — routing to ${station.name}.`,
        'Battery dropped below safe reserve; selected open solar dock.'
      );
    } else {
      if (!station.queue.includes(robot.id)) {
        station.queue.push(robot.id);
      }
      robot.objective = `Priority Queue at ${station.name}`;
      robot.decisionReason = `Battery ${Math.round(robot.battery)}% — entering priority queue at ${station.name}.`;
      this.logEvent(
        world,
        'ENERGY',
        'warning',
        robot.id,
        `${robot.id} queuing at ${station.name} (${Math.round(robot.battery)}% battery).`,
        'Alternative dock busy or offline; queued with critical-battery priority sorting.'
      );
    }

    this.planPathToStation(world, robot);
  }

  private releaseStation(world: WorldState, robot: RobotAgent): void {
    for (const st of world.stations) {
      if (st.occupiedBy === robot.id) {
        st.occupiedBy = null;
      }
      st.queue = st.queue.filter((id) => id !== robot.id);
    }
    robot.targetStationId = null;
  }

  private getQueueStandbyPos(station: ChargingStation, robotId: string): Vec2 {
    const idx = Math.max(0, station.queue.indexOf(robotId));
    return {
      x: station.waitPosition.x + (idx % 2 === 0 ? -1.4 : 1.4) * Math.ceil(idx / 2),
      z: station.waitPosition.z - idx * 1.9,
    };
  }

  private findFrontierTarget(world: WorldState, robot: RobotAgent): Vec2 | null {
    let bestCell: { col: number; row: number; score: number } | null = null;
    for (let r = 4; r < GRID_SIZE - 8; r += 2) {
      for (let c = 4; c < GRID_SIZE - 4; c += 2) {
        const idx = r * GRID_SIZE + c;
        if (world.exploredGrid[idx] === 1 || world.blockedGrid[idx] === 1) continue;
        const pos = gridToWorld(c, r);
        const d = dist2(robot.position, pos);

        let peerBias = 0;
        if (robot.commOnline) {
          for (const peer of world.robots) {
            if (peer.id !== robot.id && peer.targetPos) {
              if (dist2(peer.targetPos, pos) < 6.0) peerBias += 12.0;
            }
          }
        }

        const score = d + peerBias;
        if (!bestCell || score < bestCell.score) {
          bestCell = { col: c, row: r, score };
        }
      }
    }

    if (!bestCell) return null;
    return gridToWorld(bestCell.col, bestCell.row);
  }

  private detectMovingThreat(
    world: WorldState,
    robot: RobotAgent
  ): { id: string; label: string; dist: number; evadeDir: Vec2 } | null {
    const fwdX = Math.sin(robot.heading);
    const fwdZ = Math.cos(robot.heading);
    const visFactor = robot.perceptionConfidence;

    for (const obs of world.obstacles) {
      const dx = obs.position.x - robot.position.x;
      const dz = obs.position.z - robot.position.z;
      const d = Math.hypot(dx, dz);
      const detectRange = (obs.radius + 3.2) * (0.65 + 0.35 * visFactor);

      if (d < detectRange) {
        const nx = dx / Math.max(d, 0.001);
        const nz = dz / Math.max(d, 0.001);
        const forwardDot = nx * fwdX + nz * fwdZ;

        if (d < obs.radius + 1.85 || forwardDot > 0.22) {
          obs.activeWarning = true;
          const perpX = -nz;
          const perpZ = nx;
          const obsVelX = Math.sin(obs.heading);
          const obsVelZ = Math.cos(obs.heading);
          const sideSign = perpX * obsVelX + perpZ * obsVelZ > 0 ? -1 : 1;

          const evadeX = perpX * sideSign * 0.85 - nx * 0.45;
          const evadeZ = perpZ * sideSign * 0.85 - nz * 0.45;
          const mag = Math.hypot(evadeX, evadeZ) || 1;
          return {
            id: obs.id,
            label: obs.name,
            dist: d,
            evadeDir: { x: evadeX / mag, z: evadeZ / mag },
          };
        }
      }
    }

    // Static row obstacle immediate avoidance
    for (const stObs of world.staticObstacles) {
      const dx = stObs.position.x - robot.position.x;
      const dz = stObs.position.z - robot.position.z;
      const d = Math.hypot(dx, dz);
      if (d < stObs.radius + 1.15) {
        const nx = dx / Math.max(d, 0.001);
        const nz = dz / Math.max(d, 0.001);
        const evadeX = -nz * 0.85 - nx * 0.5;
        const evadeZ = nx * 0.85 - nz * 0.5;
        const mag = Math.hypot(evadeX, evadeZ) || 1;
        return {
          id: stObs.id,
          label: stObs.label,
          dist: d,
          evadeDir: { x: evadeX / mag, z: evadeZ / mag },
        };
      }
    }

    for (const peer of world.robots) {
      if (peer.id === robot.id) continue;
      if (robot.state === 'CHARGING' || peer.state === 'CHARGING') continue;
      const dx = peer.position.x - robot.position.x;
      const dz = peer.position.z - robot.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.15 && robot.id > peer.id) {
        const nx = dx / Math.max(d, 0.001);
        const nz = dz / Math.max(d, 0.001);
        if (nx * fwdX + nz * fwdZ > 0.3) {
          const evadeX = -nz * 0.9 - nx * 0.3;
          const evadeZ = nx * 0.9 - nz * 0.3;
          const mag = Math.hypot(evadeX, evadeZ) || 1;
          return {
            id: peer.id,
            label: peer.name,
            dist: d,
            evadeDir: { x: evadeX / mag, z: evadeZ / mag },
          };
        }
      }
    }

    return null;
  }

  private followPath(
    world: WorldState,
    robot: RobotAgent,
    finalGoal: Vec2,
    dt: number,
    allowDynamicReplan: boolean
  ): void {
    if (allowDynamicReplan) {
      const lastPlan = this.replanCooldowns.get(robot.id) ?? -99;
      if (world.simTime - lastPlan > 1.8) {
        this.replanCooldowns.set(robot.id, world.simTime);
        robot.path = findAStarPath(
          robot.position,
          finalGoal,
          world.blockedGrid,
          world.terrainCostGrid
        );
      }
    }

    if (robot.path.length === 0) {
      robot.path = findAStarPath(
        robot.position,
        finalGoal,
        world.blockedGrid,
        world.terrainCostGrid
      );
    }

    let wp = robot.path[0] ?? finalGoal;
    while (robot.path.length > 1 && dist2(robot.position, wp) < 0.75) {
      robot.path.shift();
      wp = robot.path[0];
    }

    const dx = wp.x - robot.position.x;
    const dz = wp.z - robot.position.z;
    const d = Math.hypot(dx, dz);

    if (d > 0.05) {
      this.steerTowardDirection(world, robot, { x: dx / d, z: dz / d }, robot.maxSpeed, dt);
    }

    // Stuck / deadlock recovery
    if (dist2(robot.position, robot.lastProgressPos) > 0.42) {
      robot.lastProgressPos = { ...robot.position };
      robot.stuckTimer = 0;
    } else {
      robot.stuckTimer += dt;
      if (robot.stuckTimer > 2.2) {
        robot.state = 'RECOVERING';
        robot.recoveryTimer = 0.85;
        world.metrics.deadlockRecoveries++;
        robot.decisionReason =
          'Route blocked or progress stalled — running deadlock recovery & lease release.';
        this.logEvent(
          world,
          'RECOVERY',
          'warning',
          robot.id,
          `${robot.id} progress stalled — deadlock recovery triggered.`,
          'Robot backed clear of obstruction, released lease temporarily, and reset A* planner.'
        );
      }
    }
  }

  private steerTowardDirection(
    world: WorldState,
    robot: RobotAgent,
    dir: Vec2,
    baseSpeed: number,
    dt: number
  ): void {
    const fx = this.getRobotTerrainEffects(world, robot.position);
    const locFactor = robot.localizationConfidence < 0.75 ? 0.68 : 1.0;
    const visFactor = robot.perceptionConfidence < 0.75 ? 0.62 : 1.0;
    const targetSpeed = baseSpeed * fx.traction * locFactor * visFactor;

    const desiredHeading = Math.atan2(dir.x, dir.z);
    const angleDiff = normalizeAngle(desiredHeading - robot.heading);
    const maxTurn = 4.2 * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

    robot.heading = normalizeAngle(robot.heading + turn);
    robot.steeringAngle = Math.max(-0.48, Math.min(0.48, angleDiff * 0.75));

    const turnFactor = Math.max(0.35, 1 - Math.abs(angleDiff) / Math.PI);
    const speed = targetSpeed * turnFactor;
    robot.speed = speed;

    const stepDist = speed * dt;
    const nextX = robot.position.x + Math.sin(robot.heading) * stepDist;
    const nextZ = robot.position.z + Math.cos(robot.heading) * stepDist;

    const limit = FIELD_HALF_SIZE - 1.2;
    robot.position.x = Math.max(-limit, Math.min(limit, nextX));
    robot.position.z = Math.max(-limit, Math.min(limit, nextZ));

    robot.wheelRotation += stepDist * 2.4;
    robot.distanceTraveled += stepDist;

    const drain = stepDist * 0.42 * fx.energyMult;
    robot.battery = Math.max(0, robot.battery - drain);
    robot.energyConsumed += drain;
  }

  private checkCollisionsAndSafety(world: WorldState): void {
    for (const robot of world.robots) {
      // Machinery collision check
      for (const obs of world.obstacles) {
        const d = dist2(robot.position, obs.position);
        if (d < obs.radius + 0.55) {
          const key = `${robot.id}:${obs.id}`;
          const last = this.collisionCooldowns.get(key) ?? -99;
          if (world.simTime - last > 3.0) {
            this.collisionCooldowns.set(key, world.simTime);
            world.metrics.collisionEvents++;
            this.logEvent(
              world,
              'EVENT',
              'warning',
              robot.id,
              `Collision logged with ${obs.name} (${d.toFixed(2)}m).`,
              'Safety separation threshold breached against moving agricultural equipment.'
            );
          }
          const nx = (robot.position.x - obs.position.x) / Math.max(d, 0.01);
          const nz = (robot.position.z - obs.position.z) / Math.max(d, 0.01);
          robot.position.x += nx * 0.14;
          robot.position.z += nz * 0.14;
        }
      }

      // Human safety inner-zone violation check
      for (const h of world.humans) {
        const d = dist2(robot.position, h.position);
        if (d < 1.5 && robot.speed > 0.35) {
          const key = `${robot.id}:${h.id}`;
          const last = this.safetyViolationCooldowns.get(key) ?? -99;
          if (world.simTime - last > 4.0) {
            this.safetyViolationCooldowns.set(key, world.simTime);
            world.metrics.safetyViolations++;
            this.logEvent(
              world,
              'EVENT',
              'warning',
              robot.id,
              `Safety violation: motion inside ${h.name} inner perimeter.`,
              'Movement detected too close to farm worker; safety score penalized.'
            );
          }
        }
      }
    }
  }

  private updateMetrics(world: WorldState): void {
    const viableCrops = world.crops.filter((c) => !c.isMissing);
    const harvested = viableCrops.filter((c) => c.harvested).length;
    const discovered = viableCrops.filter((c) => c.discovered).length;
    const totalBattery = world.robots.reduce((sum, r) => sum + r.battery, 0);
    const totalEnergy = world.robots.reduce((sum, r) => sum + r.energyConsumed, 0);

    let exploredCount = 0;
    for (let i = 0; i < world.exploredGrid.length; i++) {
      if (world.exploredGrid[i] === 1) exploredCount++;
    }

    world.metrics.totalCrops = world.crops.length;
    world.metrics.viableCrops = viableCrops.length;
    world.metrics.cropsHarvested = harvested;
    world.metrics.cropsRemaining = viableCrops.length - harvested;
    world.metrics.discoveredCrops = discovered;
    world.metrics.missionDuration = world.simTime;
    world.metrics.energyConsumed = totalEnergy;
    world.metrics.averageBattery = totalBattery / Math.max(1, world.robots.length);
    world.metrics.taskCompletionRate =
      (harvested / Math.max(1, viableCrops.length)) * 100;
    world.metrics.exploredPercent =
      (exploredCount / world.exploredGrid.length) * 100;
  }

  private recordSample(world: WorldState): void {
    this.lastSampleTime = world.simTime;
    const batteries = world.robots.map((r) => r.battery);
    world.energyHistory.push({
      time: Number(world.simTime.toFixed(1)),
      avgBattery: batteries.reduce((a, b) => a + b, 0) / Math.max(1, batteries.length),
      minBattery: Math.min(...batteries),
      harvested: world.metrics.cropsHarvested,
    });
    if (world.energyHistory.length > 56) {
      world.energyHistory.shift();
    }
  }

  private logEvent(
    world: WorldState,
    category: SimEventCategory,
    severity: SimEventSeverity,
    source: string,
    message: string,
    explanation: string,
    details?: Record<string, string | number>
  ): void {
    const ev: SimEvent = {
      id: `EV-${this.eventSeq++}`,
      time: world.simTime,
      severity,
      category,
      source,
      message,
      explanation,
      details,
    };
    world.events.unshift(ev);
    if (world.events.length > 60) {
      world.events.pop();
    }
  }
}
