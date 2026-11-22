import { SimEventCategory, SimEventSeverity, Vec2, WorldState } from '../types';
import { DisturbanceType, ScenarioTrigger } from './scenarioTypes';

export type LogEventFn = (
  world: WorldState,
  category: SimEventCategory,
  severity: SimEventSeverity,
  source: string,
  message: string,
  explanation: string,
  details?: Record<string, string | number>
) => void;

let disturbanceSeq = 1;

export function applyDisturbance(
  world: WorldState,
  type: DisturbanceType,
  logEvent: LogEventFn,
  params?: ScenarioTrigger['params'],
  isLiveInjection = false
): void {
  const idSuffix = disturbanceSeq++;
  const activeRobot =
    world.robots.find((r) => r.state === 'MOVING' || r.state === 'HARVESTING') ??
    world.robots[0];

  switch (type) {
    case 'tractor_crossing': {
      const start = params?.position ?? {
        x: -16.5,
        z: activeRobot ? Math.max(-14, Math.min(8, activeRobot.position.z - 2.5)) : 3.5,
      };
      const end = params?.target ?? { x: 16.5, z: start.z };
      const tractor = world.obstacles[0];
      if (tractor) {
        tractor.position = { ...start };
        tractor.waypoints = [
          { ...start },
          { ...end },
          { x: end.x, z: 9.5 },
          { x: start.x, z: 9.5 },
        ];
        tractor.currentWaypointIndex = 1;
        tractor.speed = params?.speed ?? 3.45;
        tractor.heading = Math.atan2(end.x - start.x, end.z - start.z);
      }
      logEvent(
        world,
        'EVENT',
        'warning',
        'ARENA',
        `Tractor approaching across lane z=${start.z.toFixed(1)}m.`,
        isLiveInjection
          ? 'Presenter injected live Tractor Crossing event directly ahead of active harvest corridor.'
          : 'Scenario Director scheduled tractor lane transit intersecting robot paths.',
        { laneZ: Number(start.z.toFixed(1)), speed: Number((params?.speed ?? 3.45).toFixed(1)) }
      );
      break;
    }

    case 'human_crossing': {
      const start = params?.position ?? {
        x: -15.5,
        z: activeRobot ? Math.max(-12, Math.min(6, activeRobot.position.z - 1.5)) : -2.5,
      };
      const end = params?.target ?? { x: 15.5, z: start.z };
      const safetyRadius = params?.radius ?? 3.8;
      world.humans.push({
        id: `HUM-${idSuffix}`,
        name: `Agronomist #${idSuffix}`,
        position: { ...start },
        heading: Math.atan2(end.x - start.x, end.z - start.z),
        speed: 1.75,
        safetyRadius,
        start: { ...start },
        end: { ...end },
        returning: false,
        walkCycle: 0,
        safetyStopTriggered: false,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'SAFETY',
        `Human worker entered field corridor (${safetyRadius.toFixed(1)}m safety zone).`,
        'Farm worker spawned on active row path. Robots must detect worker, trigger safety stop, and alert peers.',
        { safetyRadius }
      );
      break;
    }

    case 'monsoon_rain': {
      world.rainIntensity = 0.9;
      world.groundWetness = 0.85;
      // Add central mud patch with monsoon
      world.hazardZones.push({
        id: `HZ-MUD-${idSuffix}`,
        kind: 'mud',
        label: 'Monsoon Mud Basin',
        position: params?.position ?? { x: -3.5, z: -4.0 },
        radius: params?.radius ?? 4.8,
        tractionFactor: 0.42,
        energyMultiplier: 1.9,
        sensorScale: 0.92,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: false,
        expiresAt: null,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'WEATHER',
        'Monsoon rainfall started — ground saturated, traction reduced.',
        'Rainfall event darkened field surface and lowered wheel traction while elevating propulsion energy cost.',
        { rainIntensity: '90%', traction: '42%' }
      );
      break;
    }

    case 'mud_patch': {
      const pos: Vec2 = params?.position ??
        (activeRobot
          ? {
              x: Math.max(-14, Math.min(14, activeRobot.position.x + Math.sin(activeRobot.heading) * 3.5)),
              z: Math.max(-13, Math.min(7, activeRobot.position.z + Math.cos(activeRobot.heading) * 3.5)),
            }
          : { x: -10.5, z: -2.0 });
      world.groundWetness = Math.max(world.groundWetness, 0.55);
      world.hazardZones.push({
        id: `HZ-MUD-${idSuffix}`,
        kind: 'mud',
        label: 'Saturated Mud Patch',
        position: pos,
        radius: params?.radius ?? 3.8,
        tractionFactor: 0.45,
        energyMultiplier: 1.85,
        sensorScale: 1.0,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: false,
        expiresAt: params?.duration ? world.simTime + params.duration : null,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'TERRAIN',
        `Mud patch formed at (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}) — 2.8x A* traversal cost.`,
        'High-drag mud zone raises propulsion power draw and triggers cost-weighted A* rerouting.',
        { x: Number(pos.x.toFixed(1)), z: Number(pos.z.toFixed(1)) }
      );
      break;
    }

    case 'gps_canopy': {
      const pos = params?.position ?? { x: -12.5, z: -6.5 };
      world.hazardZones.push({
        id: `HZ-GPS-${idSuffix}`,
        kind: 'canopy',
        label: 'Dense Canopy (Simulated GPS Loss)',
        position: pos,
        radius: params?.radius ?? 6.2,
        tractionFactor: 0.9,
        energyMultiplier: 1.05,
        sensorScale: 0.9,
        gpsConfidenceDrop: 0.65,
        commBlocked: false,
        unsafe: false,
        expiresAt: null,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'LOCALIZATION',
        'Dense canopy zone active — simulated satellite localization degraded.',
        'Simulated localization confidence drops inside canopy; robots rely on odometry and local landmark relocalization.',
        { x: Number(pos.x.toFixed(1)), z: Number(pos.z.toFixed(1)) }
      );
      break;
    }

    case 'dust_cloud': {
      const pos: Vec2 = params?.position ??
        (activeRobot
          ? {
              x: Math.max(-14, Math.min(14, activeRobot.position.x)),
              z: Math.max(-13, Math.min(6, activeRobot.position.z - 2)),
            }
          : { x: 10.5, z: -4.0 });
      world.dustIntensity = 0.75;
      world.hazardZones.push({
        id: `HZ-DUST-${idSuffix}`,
        kind: 'dust',
        label: 'Dust Plume (Low Visibility)',
        position: pos,
        radius: params?.radius ?? 6.4,
        tractionFactor: 0.95,
        energyMultiplier: 1.05,
        sensorScale: 0.52,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: false,
        expiresAt: params?.duration ? world.simTime + params.duration : null,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'PERCEPTION',
        `Dust cloud reduced sensor visibility by 48% around (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}).`,
        'Reduced visibility forces cautious transit speeds and target re-observation before committing.',
        { sensorScale: '52%' }
      );
      break;
    }

    case 'blocked_row': {
      const pos: Vec2 = params?.position ??
        (activeRobot?.targetPos
          ? {
              x: (activeRobot.position.x + activeRobot.targetPos.x) * 0.5,
              z: (activeRobot.position.z + activeRobot.targetPos.z) * 0.5,
            }
          : { x: -3.5, z: -2.5 });
      const dur = params?.duration ?? (isLiveInjection ? 18 : 22);
      world.staticObstacles.push({
        id: `BLK-${idSuffix}`,
        label: idSuffix % 2 === 0 ? 'Irrigation Pipe Rig' : 'Dropped Supply Crates',
        kind: idSuffix % 2 === 0 ? 'irrigation_pipe' : 'crates',
        position: pos,
        radius: params?.radius ?? 2.1,
        expiresAt: world.simTime + dur,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'OBSTRUCTION',
        `Harvesting corridor blocked at (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}) for ${dur}s.`,
        'Dynamic obstruction inserted into field corridor; robots must replan A* or temporarily release blocked task leases.',
        { durationSec: dur }
      );
      break;
    }

    case 'charger_failure': {
      const targetId = params?.stationId ?? 'CHG-WEST';
      const st = world.stations.find((s) => s.id === targetId) ?? world.stations[0];
      if (st) {
        st.offline = true;
        st.offlineUntil = params?.duration ? world.simTime + params.duration : null;
        // Evict docked or queued robots cleanly so they reroute!
        if (st.occupiedBy) {
          const r = world.robots.find((rob) => rob.id === st.occupiedBy);
          if (r) {
            r.targetStationId = null;
            r.state = 'IDLE';
            r.decisionReason = `${st.name} went offline — switching to alternative charging dock.`;
          }
          st.occupiedBy = null;
        }
        for (const qId of st.queue) {
          const r = world.robots.find((rob) => rob.id === qId);
          if (r) {
            r.targetStationId = null;
            r.state = 'IDLE';
          }
        }
        st.queue = [];
        logEvent(
          world,
          'ENERGY',
          'warning',
          st.id,
          `${st.name} faulted offline — fleet charging capacity halved.`,
          'Station inverter failure disabled dock; returning and low-battery robots must coordinate on the remaining dock.',
          { station: st.name }
        );
      }
      break;
    }

    case 'comm_blackspot': {
      const pos = params?.position ?? { x: 0.0, z: -3.5 };
      const dur = params?.duration ?? 20;
      world.hazardZones.push({
        id: `HZ-COMM-${idSuffix}`,
        kind: 'comm_blackspot',
        label: 'RF Interference Black Spot',
        position: pos,
        radius: params?.radius ?? 8.0,
        tractionFactor: 1.0,
        energyMultiplier: 1.0,
        sensorScale: 1.0,
        gpsConfidenceDrop: 0,
        commBlocked: true,
        unsafe: false,
        expiresAt: world.simTime + dur,
      });
      logEvent(
        world,
        'COORDINATION',
        'warning',
        'RF-LINK',
        `Communication black spot active for ${dur}s — local leases & expiry active.`,
        'Inter-robot broadcasts dropped inside black spot; agents operate safely offline using lease timeouts until reconnection.',
        { durationSec: dur }
      );
      break;
    }

    case 'uneven_slope': {
      world.hazardZones.push({
        id: `HZ-SLOPE-${idSuffix}`,
        kind: 'slope',
        label: 'Steep Ridged Slope',
        position: params?.position ?? { x: -11.5, z: -4.5 },
        radius: params?.radius ?? 5.2,
        tractionFactor: 0.58,
        energyMultiplier: 1.65,
        sensorScale: 1.0,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: false,
        expiresAt: null,
      });
      world.hazardZones.push({
        id: `HZ-SLOPE-${idSuffix + 100}`,
        kind: 'slope',
        label: 'Compacted Furrow Ridge',
        position: { x: 11.5, z: -2.0 },
        radius: 4.4,
        tractionFactor: 0.62,
        energyMultiplier: 1.55,
        sensorScale: 1.0,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: false,
        expiresAt: null,
      });
      logEvent(
        world,
        'EVENT',
        'info',
        'TERRAIN',
        'Uneven terrain ridges mapped — slope traversal weights updated.',
        'Sloping ground increases propulsion energy and reduces wheel speed, guiding A* toward flatter corridors.',
        { ridges: 2 }
      );
      break;
    }

    case 'waterlog_leak': {
      const pos = params?.position ?? { x: 2.0, z: -6.5 };
      world.groundWetness = Math.max(world.groundWetness, 0.45);
      world.hazardZones.push({
        id: `HZ-WATER-${idSuffix}`,
        kind: 'waterlog',
        label: 'Waterlogged Flood Hazard',
        position: pos,
        radius: params?.radius ?? 3.6,
        tractionFactor: 0.25,
        energyMultiplier: 2.5,
        sensorScale: 1.0,
        gpsConfidenceDrop: 0,
        commBlocked: false,
        unsafe: true,
        expiresAt: null,
      });
      logEvent(
        world,
        'EVENT',
        'warning',
        'IRRIGATION',
        `Irrigation valve leak flooded sector (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}).`,
        'Waterlogged zone flagged unsafe; navigation assigns extreme traversal cost and detours around standing water.',
        { x: Number(pos.x.toFixed(1)), z: Number(pos.z.toFixed(1)) }
      );
      break;
    }

    case 'weather_deadline': {
      logEvent(
        world,
        'EVENT',
        'warning',
        'STORM-FRONT',
        `Storm arrival in ${world.deadlineSec ?? 65}s — prioritizing critical mature crops.`,
        'High-urgency crops receive priority bidding boosts while preserving battery safety reserves.',
        { deadlineSec: world.deadlineSec ?? 65 }
      );
      break;
    }
  }
}

export function updateDisturbances(
  world: WorldState,
  dt: number,
  logEvent: LogEventFn
): void {
  // 1. Recover expired hazard zones
  const beforeHazards = world.hazardZones.length;
  world.hazardZones = world.hazardZones.filter(
    (hz) => hz.expiresAt === null || world.simTime < hz.expiresAt
  );
  if (world.hazardZones.length < beforeHazards) {
    const hasDust = world.hazardZones.some((h) => h.kind === 'dust');
    if (!hasDust) world.dustIntensity = 0;

    // Check if comm blackspot expired -> reconcile!
    const hasCommBlock = world.hazardZones.some((h) => h.commBlocked);
    if (!hasCommBlock) {
      for (const r of world.robots) {
        if (!r.commOnline) {
          r.commOnline = true;
        }
      }
      logEvent(
        world,
        'COORDINATION',
        'success',
        'RF-LINK',
        'Communication link restored — reconciled fleet task leases & crop inventory.',
        'Expired RF black spot allowed all robots to synchronize local harvest claims and prevent duplicate work.'
      );
    }
  }

  // 2. Clear expired static row obstructions
  const beforeObs = world.staticObstacles.length;
  world.staticObstacles = world.staticObstacles.filter(
    (o) => o.expiresAt === null || world.simTime < o.expiresAt
  );
  if (world.staticObstacles.length < beforeObs) {
    logEvent(
      world,
      'RECOVERY',
      'success',
      'OBSTRUCTION',
      'Corridor obstruction cleared — blocked rows reopened for retry.',
      'Field team cleared temporary obstacle; robots can now re-bid on previously blocked crops.'
    );
  }

  // 3. Recover offline charging stations if timed
  for (const st of world.stations) {
    if (st.offline && st.offlineUntil !== null && world.simTime >= st.offlineUntil) {
      st.offline = false;
      st.offlineUntil = null;
      logEvent(
        world,
        'ENERGY',
        'success',
        st.id,
        `${st.name} restored online — dual charging capacity available.`,
        'Charging station inverter reset succeeded, relieving queue pressure on the backup dock.'
      );
    }
  }

  // 4. Advance walking Human Workers across rows
  for (const h of world.humans) {
    h.safetyStopTriggered = false;
    const target = h.returning ? h.start : h.end;
    const dx = target.x - h.position.x;
    const dz = target.z - h.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35) {
      h.returning = !h.returning;
      continue;
    }
    h.heading = Math.atan2(dx, dz);
    const step = Math.min(d, h.speed * dt);
    h.position.x += (dx / d) * step;
    h.position.z += (dz / d) * step;
    h.walkCycle += step * 4.5;
  }
}
