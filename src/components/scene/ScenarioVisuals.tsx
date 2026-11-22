import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { simulation, useSimStore } from '../../store/useSimStore';
import { HazardZone, HumanWorker, StaticRowObstacle } from '../../simulation/types';

const RAIN_COUNT = 220;
const _dummy = new THREE.Object3D();

function HumanFigure({ worker, index }: { worker: HumanWorker; index: number }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const live = simulation.world.humans[index];
    if (!live || !rootRef.current) return;

    rootRef.current.position.set(live.position.x, 0, live.position.z);
    rootRef.current.rotation.y = live.heading;

    const swing = Math.sin(live.walkCycle) * 0.45;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;

    if (ringMatRef.current) {
      const pulse = 0.55 + Math.sin(clock.getElapsedTime() * 6) * 0.2;
      ringMatRef.current.color.set(live.safetyStopTriggered ? '#ef4444' : '#fb7185');
      ringMatRef.current.opacity = live.safetyStopTriggered ? 0.85 : pulse * 0.65;
    }
  });

  return (
    <group ref={rootRef} position={[worker.position.x, 0, worker.position.z]}>
      {/* Safety Exclusion Perimeter Ring */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[worker.safetyRadius - 0.14, worker.safetyRadius, 36]} />
        <meshBasicMaterial ref={ringMatRef} color="#fb7185" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[worker.safetyRadius, 32]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.08} />
      </mesh>

      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.16, 0.78, 0.18]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.16, 0.78, 0.18]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>

      {/* High-Vis Safety Vest Torso */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.46, 0.64, 0.26]} />
        <meshStandardMaterial color="#facc15" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[0.48, 0.1, 0.28]} />
        <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.35} />
      </mesh>

      {/* Arms */}
      <mesh ref={leftArmRef} position={[-0.31, 1.06, 0]} castShadow>
        <boxGeometry args={[0.13, 0.56, 0.14]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.65} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.31, 1.06, 0]} castShadow>
        <boxGeometry args={[0.13, 0.56, 0.14]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.65} />
      </mesh>

      {/* Head + Hard Hat */}
      <mesh position={[0, 1.56, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#eab68a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} />
      </mesh>
    </group>
  );
}

function HazardZoneMesh({ hz }: { hz: HazardZone }) {
  if (hz.kind === 'mud') {
    return (
      <group position={[hz.position.x, 0.052, hz.position.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[hz.radius, 28]} />
          <meshStandardMaterial color="#2b1d12" roughness={0.22} metalness={0.18} />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hz.radius - 0.15, hz.radius, 28]} />
          <meshBasicMaterial color="#92400e" transparent opacity={0.55} />
        </mesh>
      </group>
    );
  }

  if (hz.kind === 'waterlog') {
    return (
      <group position={[hz.position.x, 0.058, hz.position.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[hz.radius, 30]} />
          <meshStandardMaterial
            color="#0369a1"
            roughness={0.08}
            metalness={0.65}
            transparent
            opacity={0.78}
          />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hz.radius - 0.16, hz.radius, 30]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} />
        </mesh>
      </group>
    );
  }

  if (hz.kind === 'slope') {
    return (
      <group position={[hz.position.x, 0.04, hz.position.z]}>
        <mesh scale={[1, 0.22, 1]} receiveShadow>
          <coneGeometry args={[hz.radius, 2.2, 18]} />
          <meshStandardMaterial color="#6b4f32" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hz.radius - 0.12, hz.radius, 24]} />
          <meshBasicMaterial color="#d97706" transparent opacity={0.45} />
        </mesh>
      </group>
    );
  }

  if (hz.kind === 'canopy') {
    return (
      <group position={[hz.position.x, 0, hz.position.z]}>
        {/* Elevated dense canopy arches */}
        <mesh position={[0, 3.6, 0]} castShadow>
          <cylinderGeometry args={[hz.radius * 0.92, hz.radius * 0.98, 0.5, 24]} />
          <meshStandardMaterial color="#14532d" roughness={0.85} transparent opacity={0.72} />
        </mesh>
        {/* Corner canopy trunks */}
        {[0, 1, 2, 3].map((k) => {
          const ang = (k / 4) * Math.PI * 2 + 0.4;
          const r = hz.radius * 0.78;
          return (
            <mesh key={k} position={[Math.cos(ang) * r, 1.8, Math.sin(ang) * r]} castShadow>
              <cylinderGeometry args={[0.16, 0.22, 3.6, 7]} />
              <meshStandardMaterial color="#452c1b" roughness={0.9} />
            </mesh>
          );
        })}
        {/* Simulated localization degradation perimeter */}
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hz.radius - 0.15, hz.radius, 36]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.65} />
        </mesh>
      </group>
    );
  }

  if (hz.kind === 'dust') {
    return (
      <group position={[hz.position.x, 0.9, hz.position.z]}>
        <mesh>
          <cylinderGeometry args={[hz.radius, hz.radius * 1.08, 2.2, 24]} />
          <meshBasicMaterial color="#d9a441" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hz.radius - 0.14, hz.radius, 32]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.55} />
        </mesh>
      </group>
    );
  }

  // comm_blackspot
  return (
    <group position={[hz.position.x, 0.08, hz.position.z]}>
      <mesh>
        <sphereGeometry args={[hz.radius, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[hz.radius - 0.14, hz.radius, 36]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function StaticObstacleMesh({ obs }: { obs: StaticRowObstacle }) {
  return (
    <group position={[obs.position.x, 0, obs.position.z]}>
      {/* Hazard ground ring */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[obs.radius - 0.12, obs.radius + 0.05, 24]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.7} />
      </mesh>

      {obs.kind === 'crates' ? (
        <group>
          <mesh position={[-0.4, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial color="#9a683a" roughness={0.85} />
          </mesh>
          <mesh position={[0.45, 0.4, 0.2]} rotation={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.75, 0.75, 0.75]} />
            <meshStandardMaterial color="#b45309" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.15, 0.05]} rotation={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.72, 0.65, 0.72]} />
            <meshStandardMaterial color="#c27a3e" roughness={0.82} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Orange irrigation pipe barrier */}
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 2.8, 12]} />
            <meshStandardMaterial color="#ea580c" roughness={0.45} metalness={0.25} />
          </mesh>
          <mesh position={[-0.9, 0.35, 0]} castShadow>
            <boxGeometry args={[0.24, 0.7, 0.7]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          <mesh position={[0.9, 0.35, 0]} castShadow>
            <boxGeometry args={[0.24, 0.7, 0.7]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function ScenarioVisuals() {
  const world = useSimStore((s) => s.worldSnapshot);
  const rainRef = useRef<THREE.InstancedMesh>(null);

  const rainDrops = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, (_, i) => ({
        x: (((i * 73) % 44) - 22),
        y: ((i * 29) % 16) + 1,
        z: (((i * 113) % 44) - 22),
        speed: 14 + (i % 5) * 1.8,
      })),
    []
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const liveRain = simulation.world.rainIntensity;
    if (!rainRef.current) return;

    rainRef.current.visible = liveRain > 0.1;
    if (liveRain <= 0.1) return;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = rainDrops[i];
      d.y -= d.speed * dt;
      if (d.y < 0.2) d.y = 16;
      _dummy.position.set(d.x, d.y, d.z);
      _dummy.rotation.set(0, 0, 0.08);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      rainRef.current.setMatrixAt(i, _dummy.matrix);
    }
    rainRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Monsoon Wet Ground Darkening Overlay */}
      {world.groundWetness > 0.15 && (
        <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[42, 42]} />
          <meshBasicMaterial
            color="#0a1610"
            transparent
            opacity={Math.min(0.45, world.groundWetness * 0.42)}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Rain Streaks */}
      <instancedMesh
        ref={rainRef}
        args={[undefined, undefined, RAIN_COUNT]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[0.025, 0.65, 0.025]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.45} />
      </instancedMesh>

      {/* Human Farm Workers */}
      {world.humans.map((h, i) => (
        <HumanFigure key={h.id} worker={h} index={i} />
      ))}

      {/* Active Hazard Zones (Mud, Canopy, Dust, Comm Blackspot, Slope, Waterlog) */}
      {world.hazardZones.map((hz) => (
        <HazardZoneMesh key={hz.id} hz={hz} />
      ))}

      {/* Static Row Obstructions */}
      {world.staticObstacles.map((obs) => (
        <StaticObstacleMesh key={obs.id} obs={obs} />
      ))}
    </group>
  );
}
