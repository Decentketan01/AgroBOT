import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { simulation } from '../../store/useSimStore';
import { CropNode } from '../../simulation/types';

const PARTICLE_COUNT = 72;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function CropPlant({ crop, index }: { crop: CropNode; index: number }) {
  const crownRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const liveCrop = simulation.world.crops[index];
    if (!liveCrop || !crownRef.current) return;

    const t = clock.getElapsedTime();
    if (liveCrop.harvested) {
      crownRef.current.scale.set(0.55, 0.14, 0.55);
      crownRef.current.rotation.set(0, 0, 0);
    } else {
      const remainingScale = Math.max(0.18, 1 - liveCrop.harvestProgress * 0.85);
      crownRef.current.scale.set(
        remainingScale,
        remainingScale,
        remainingScale
      );
      const sway = Math.sin(t * 2.1 + index * 0.8) * 0.06;
      const harvestShake =
        liveCrop.harvestProgress > 0 && liveCrop.harvestProgress < 1
          ? Math.sin(t * 28) * 0.1
          : 0;
      crownRef.current.rotation.set(sway + harvestShake, index * 0.5, sway * 0.6);
    }

    if (ringRef.current && ringMatRef.current) {
      if (!liveCrop.harvested && liveCrop.claimedBy) {
        ringRef.current.visible = true;
        const owner = simulation.world.robots.find((r) => r.id === liveCrop.claimedBy);
        ringMatRef.current.color.set(owner?.accentColor ?? '#22d3ee');
        const pulse = 1 + Math.sin(t * 5) * 0.08;
        ringRef.current.scale.set(pulse, pulse, 1);
      } else if (!liveCrop.harvested && liveCrop.discovered) {
        ringRef.current.visible = true;
        ringMatRef.current.color.set('#a3e635');
        ringMatRef.current.opacity = 0.22;
        ringRef.current.scale.set(0.85, 0.85, 1);
      } else {
        ringRef.current.visible = false;
      }
      if (liveCrop.claimedBy) {
        ringMatRef.current.opacity = 0.72;
      }
    }
  });

  return (
    <group position={[crop.position.x, 0.07, crop.position.z]}>
      {/* Soil mound base */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.38, 0.48, 0.12, 8]} />
        <meshStandardMaterial color={crop.isMissing ? '#261a10' : '#342316'} roughness={0.95} />
      </mesh>

      {/* Critical Deadline Priority Ring */}
      {crop.priority === 'critical' && !crop.harvested && !crop.isMissing && (
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.66, 0.78, 24]} />
          <meshBasicMaterial color="#f43f5e" transparent opacity={0.78} />
        </mesh>
      )}

      {/* Claim / Discovery ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.52, 0.64, 24]} />
        <meshBasicMaterial ref={ringMatRef} color="#22d3ee" transparent opacity={0.65} />
      </mesh>

      {/* Crop Botanical Silhouette (omitted if planting spot is empty) */}
      {!crop.isMissing && (
        <group ref={crownRef} position={[0, 0.08, 0]}>
          {crop.cropType === 'wheat' && (
            <group>
              {[
                [0, 0],
                [0.14, 0.1],
                [-0.13, 0.11],
                [0.11, -0.14],
                [-0.12, -0.11],
              ].map(([ox, oz], k) => (
                <group key={k} position={[ox, 0, oz]}>
                  <mesh position={[0, 0.32, 0]} castShadow>
                    <cylinderGeometry args={[0.025, 0.035, 0.65, 5]} />
                    <meshStandardMaterial color="#8ca343" roughness={0.78} />
                  </mesh>
                  <mesh position={[0, 0.72, 0]} castShadow>
                    <capsuleGeometry args={[0.055, 0.22, 4, 6]} />
                    <meshStandardMaterial color="#e8b838" roughness={0.58} />
                  </mesh>
                </group>
              ))}
            </group>
          )}

          {crop.cropType === 'maize' && (
            <group>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.09, 1.1, 7]} />
                <meshStandardMaterial color="#2f853c" roughness={0.72} />
              </mesh>
              {/* Broad leaves */}
              <mesh position={[0.18, 0.48, 0]} rotation={[0, 0, -0.7]} castShadow>
                <boxGeometry args={[0.38, 0.04, 0.14]} />
                <meshStandardMaterial color="#3ea14a" roughness={0.7} />
              </mesh>
              <mesh position={[-0.18, 0.62, 0.06]} rotation={[0, 0.3, 0.7]} castShadow>
                <boxGeometry args={[0.38, 0.04, 0.14]} />
                <meshStandardMaterial color="#3ea14a" roughness={0.7} />
              </mesh>
              {/* Golden corn cobs */}
              <mesh position={[0.11, 0.72, 0.08]} rotation={[0.2, 0, -0.35]} castShadow>
                <capsuleGeometry args={[0.065, 0.18, 4, 6]} />
                <meshStandardMaterial color="#f5c528" roughness={0.5} />
              </mesh>
              <mesh position={[-0.1, 0.85, -0.06]} rotation={[-0.2, 0, 0.35]} castShadow>
                <capsuleGeometry args={[0.06, 0.16, 4, 6]} />
                <meshStandardMaterial color="#f5c528" roughness={0.5} />
              </mesh>
            </group>
          )}

          {crop.cropType === 'sunflower' && (
            <group>
              <mesh position={[0, 0.48, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.065, 0.96, 7]} />
                <meshStandardMaterial color="#3c7c34" roughness={0.78} />
              </mesh>
              <mesh position={[0.14, 0.4, 0]} rotation={[0, 0, -0.5]} castShadow>
                <boxGeometry args={[0.26, 0.03, 0.16]} />
                <meshStandardMaterial color="#4ca644" roughness={0.75} />
              </mesh>
              {/* Sunflower head */}
              <group position={[0, 0.98, 0]} rotation={[0.25, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.26, 0.24, 0.07, 12]} />
                  <meshStandardMaterial color="#facc15" roughness={0.48} />
                </mesh>
                <mesh position={[0, 0.04, 0]} castShadow>
                  <cylinderGeometry args={[0.14, 0.14, 0.04, 10]} />
                  <meshStandardMaterial color="#452719" roughness={0.88} />
                </mesh>
              </group>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

export function CropField() {
  const initialCrops = useMemo(() => simulation.world.crops, []);
  const particleRef = useRef<THREE.InstancedMesh>(null);
  const particlesState = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      color: '#facc15',
    }))
  );
  const seenBurstIds = useRef(new Set<string>());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const triggers = simulation.world.harvestParticlesTrigger;

    // Spawn bursts for newly harvested crops
    for (const trig of triggers) {
      if (seenBurstIds.current.has(trig.id)) continue;
      seenBurstIds.current.add(trig.id);
      if (seenBurstIds.current.size > 100) seenBurstIds.current.clear();

      let spawned = 0;
      for (let i = 0; i < PARTICLE_COUNT && spawned < 12; i++) {
        const p = particlesState.current[i];
        if (!p.active) {
          const angle = (spawned / 12) * Math.PI * 2;
          p.active = true;
          p.x = trig.position.x;
          p.y = 0.5;
          p.z = trig.position.z;
          p.vx = Math.cos(angle) * (1.2 + (spawned % 3) * 0.5);
          p.vy = 2.6 + (spawned % 4) * 0.6;
          p.vz = Math.sin(angle) * (1.2 + (spawned % 3) * 0.5);
          p.life = 1.0;
          p.color =
            trig.cropType === 'maize'
              ? '#a3e635'
              : trig.cropType === 'wheat'
                ? '#fbbf24'
                : '#fde047';
          spawned++;
        }
      }
    }

    if (!particleRef.current) return;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particlesState.current[i];
      if (p.active) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 7.8 * dt;
        p.life -= dt * 1.15;
        if (p.life <= 0 || p.y < 0.05) {
          p.active = false;
          _dummy.position.set(0, -20, 0);
          _dummy.scale.set(0.001, 0.001, 0.001);
        } else {
          _dummy.position.set(p.x, p.y, p.z);
          _dummy.rotation.set(p.life * 4, p.life * 6, 0);
          const s = p.life * 0.14;
          _dummy.scale.set(s, s, s);
          _color.set(p.color);
          particleRef.current.setColorAt(i, _color);
        }
      } else {
        _dummy.position.set(0, -20, 0);
        _dummy.scale.set(0.001, 0.001, 0.001);
      }
      _dummy.updateMatrix();
      particleRef.current.setMatrixAt(i, _dummy.matrix);
    }
    particleRef.current.instanceMatrix.needsUpdate = true;
    if (particleRef.current.instanceColor) {
      particleRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {initialCrops.map((crop, idx) => (
        <CropPlant key={crop.id} crop={crop} index={idx} />
      ))}

      {/* Pooled harvest particle bursts */}
      <instancedMesh
        ref={particleRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}
