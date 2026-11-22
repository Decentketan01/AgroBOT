import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { simulation } from '../../store/useSimStore';
import { createContactShadowTexture, IS_SOFTWARE_GL } from './materials';

function ObstacleUnit({ index }: { index: number }) {
  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  const groupRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const warnRingRef = useRef<THREE.Mesh>(null);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);

  const obsInitial = simulation.world.obstacles[index];

  useFrame(({ clock }) => {
    const obs = simulation.world.obstacles[index];
    if (!obs || !groupRef.current) return;
    const t = clock.getElapsedTime();

    groupRef.current.position.set(obs.position.x, 0, obs.position.z);
    groupRef.current.rotation.y = obs.heading;

    for (const w of wheelRefs.current) {
      if (w) w.rotation.x = obs.wheelRotation;
    }

    if (beaconRef.current) {
      beaconRef.current.rotation.y = t * 7.5;
    }

    if (warnRingRef.current) {
      warnRingRef.current.visible = obs.activeWarning;
      if (obs.activeWarning) {
        const s = 1 + Math.sin(t * 14) * 0.12;
        warnRingRef.current.scale.set(s, s, 1);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[obsInitial.position.x, 0, obsInitial.position.z]}
      rotation={[0, obsInitial.heading, 0]}
    >
      {/* Ground contact shadow */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 4.0]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.58} />
      </mesh>

      {/* Proximity Obstacle Warning Ring */}
      <mesh
        ref={warnRingRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[obsInitial.radius + 0.35, obsInitial.radius + 0.58, 28]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
      </mesh>

      {obsInitial.kind === 'tractor' && (
        <group>
          {/* Tractor Engine Hood */}
          <mesh position={[0, 0.85, 0.65]} castShadow receiveShadow>
            <boxGeometry args={[0.95, 0.72, 1.45]} />
            <meshStandardMaterial color="#1f7a38" roughness={0.38} metalness={0.35} />
          </mesh>
          {/* Yellow Grill Stripe */}
          <mesh position={[0, 0.9, 1.39]} castShadow>
            <boxGeometry args={[0.85, 0.32, 0.05]} />
            <meshStandardMaterial color="#eab308" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Glass Operator Cab */}
          <mesh position={[0, 1.45, -0.45]} castShadow>
            <boxGeometry args={[1.15, 0.95, 1.05]} />
            <meshPhysicalMaterial
              color="#94d8f0"
              roughness={0.08}
              metalness={0.1}
              transmission={IS_SOFTWARE_GL ? 0 : 0.75}
              transparent
              opacity={IS_SOFTWARE_GL ? 0.55 : 1}
              ior={1.5}
            />
          </mesh>
          {/* Cab Roof */}
          <mesh position={[0, 1.98, -0.45]} castShadow>
            <boxGeometry args={[1.25, 0.14, 1.18]} />
            <meshStandardMaterial color="#1f7a38" roughness={0.45} metalness={0.3} />
          </mesh>
          {/* Exhaust Stack */}
          <mesh position={[0.42, 1.55, 0.75]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.8, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.35} metalness={0.8} />
          </mesh>
          {/* Rotating Amber Beacon */}
          <mesh ref={beaconRef} position={[0, 2.15, -0.45]}>
            <cylinderGeometry args={[0.1, 0.12, 0.18, 10]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#f59e0b"
              emissiveIntensity={1.6}
            />
          </mesh>
          {/* Giant Rear Tires + Front Tires */}
          {[
            { pos: [-0.72, 0.34, 0.95] as [number, number, number], r: 0.34, w: 0.24 },
            { pos: [0.72, 0.34, 0.95] as [number, number, number], r: 0.34, w: 0.24 },
            { pos: [-0.78, 0.54, -0.58] as [number, number, number], r: 0.54, w: 0.34 },
            { pos: [0.78, 0.54, -0.58] as [number, number, number], r: 0.54, w: 0.34 },
          ].map((wh, i) => (
            <mesh
              key={i}
              ref={(el) => {
                wheelRefs.current[i] = el;
              }}
              position={wh.pos}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[wh.r, wh.r, wh.w, 16]} />
              <meshStandardMaterial color="#18181b" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {obsInitial.kind === 'utility_cart' && (
        <group>
          {/* Flatbed Chassis */}
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.15, 0.22, 2.1]} />
            <meshStandardMaterial color="#b45309" roughness={0.48} metalness={0.35} />
          </mesh>
          {/* Cargo Crates */}
          <mesh position={[-0.2, 0.8, -0.25]} castShadow>
            <boxGeometry args={[0.55, 0.45, 0.65]} />
            <meshStandardMaterial color="#926239" roughness={0.85} />
          </mesh>
          <mesh position={[0.28, 0.76, 0.2]} castShadow>
            <boxGeometry args={[0.45, 0.38, 0.55]} />
            <meshStandardMaterial color="#3f6212" roughness={0.7} />
          </mesh>
          {/* Front Roll Bar + Beacon */}
          <mesh position={[0, 1.05, 0.75]} castShadow>
            <boxGeometry args={[1.05, 0.85, 0.12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh ref={beaconRef} position={[0, 1.54, 0.75]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.5} />
          </mesh>
          {[
            [-0.65, 0.28, 0.72],
            [0.65, 0.28, 0.72],
            [-0.65, 0.28, -0.72],
            [0.65, 0.28, -0.72],
          ].map((pos, i) => (
            <mesh
              key={i}
              ref={(el) => {
                wheelRefs.current[i] = el;
              }}
              position={pos as [number, number, number]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.28, 0.28, 0.2, 12]} />
              <meshStandardMaterial color="#18181b" roughness={0.88} />
            </mesh>
          ))}
        </group>
      )}

      {obsInitial.kind === 'sprayer' && (
        <group>
          {/* Chassis Frame */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.0, 0.24, 1.75]} />
            <meshStandardMaterial color="#0f766e" roughness={0.45} metalness={0.5} />
          </mesh>
          {/* Cylindrical Water Tank */}
          <mesh position={[0, 0.88, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.25, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.28} metalness={0.25} />
          </mesh>
          {/* Twin Spray Booms */}
          <mesh position={[0, 0.65, -0.75]} castShadow>
            <boxGeometry args={[2.5, 0.08, 0.08]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh ref={beaconRef} position={[0, 1.38, 0.3]}>
            <cylinderGeometry args={[0.09, 0.1, 0.16, 10]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.5} />
          </mesh>
          {[
            [-0.6, 0.28, 0.6],
            [0.6, 0.28, 0.6],
            [-0.6, 0.28, -0.6],
            [0.6, 0.28, -0.6],
          ].map((pos, i) => (
            <mesh
              key={i}
              ref={(el) => {
                wheelRefs.current[i] = el;
              }}
              position={pos as [number, number, number]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.28, 0.28, 0.2, 12]} />
              <meshStandardMaterial color="#18181b" roughness={0.88} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function MovingObstacles() {
  const obstacles = useMemo(() => simulation.world.obstacles, []);
  return (
    <group>
      {obstacles.map((obs, idx) => (
        <ObstacleUnit key={obs.id} index={idx} />
      ))}
    </group>
  );
}
