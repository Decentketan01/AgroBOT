import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { simulation, useSimStore } from '../../store/useSimStore';
import { createSolarPanelTexture } from './materials';
import { ChargingStation } from '../../simulation/types';

function StationUnit({ station, index }: { station: ChargingStation; index: number }) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  const solarTex = useMemo(() => createSolarPanelTexture(maxAniso), [maxAniso]);

  useEffect(() => () => solarTex.dispose(), [solarTex]);

  const energyRingRef = useRef<THREE.Mesh>(null);
  const beaconMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const live = simulation.world.stations[index];
    if (!live) return;
    const t = clock.getElapsedTime();

    const occupant = live.occupiedBy
      ? simulation.world.robots.find((r) => r.id === live.occupiedBy)
      : null;
    const isCharging = occupant?.state === 'CHARGING';

    if (energyRingRef.current) {
      energyRingRef.current.visible = Boolean(isCharging);
      if (isCharging) {
        const cycle = (t * 1.4) % 1;
        energyRingRef.current.position.y = 0.2 + cycle * 2.1;
        const s = 1 + Math.sin(cycle * Math.PI) * 0.12;
        energyRingRef.current.scale.set(s, s, 1);
      }
    }

    if (beaconMatRef.current) {
      if (live.offline) {
        beaconMatRef.current.color.set('#ef4444');
        beaconMatRef.current.emissive.set('#ef4444');
        beaconMatRef.current.emissiveIntensity = 1.8;
      } else if (isCharging) {
        beaconMatRef.current.color.set('#22d3ee');
        beaconMatRef.current.emissive.set('#22d3ee');
        beaconMatRef.current.emissiveIntensity = 1.6;
      } else if (live.occupiedBy || live.queue.length > 0) {
        beaconMatRef.current.color.set('#fbbf24');
        beaconMatRef.current.emissive.set('#fbbf24');
        beaconMatRef.current.emissiveIntensity = 1.2;
      } else {
        beaconMatRef.current.color.set('#a3e635');
        beaconMatRef.current.emissive.set('#a3e635');
        beaconMatRef.current.emissiveIntensity = 1.1;
      }
    }
  });

  const liveStation = useSimStore((s) => s.worldSnapshot.stations[index]);
  const isOffline = liveStation?.offline ?? false;

  return (
    <group position={[station.position.x, 0, station.position.z]}>
      {/* Offline Fault Barrier */}
      {isOffline && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.55, 1.82, 28]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
        </mesh>
      )}
      {/* Concrete docking pad */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[3.6, 0.08, 3.6]} />
        <meshStandardMaterial color="#27322d" roughness={0.82} metalness={0.12} />
      </mesh>

      {/* Pad safety border */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.38, 28]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>

      {/* Left & Right Steel Arch Pillars */}
      <mesh position={[-1.45, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 2.6, 0.34]} />
        <meshStandardMaterial color="#1f2933" roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh position={[1.45, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 2.6, 0.34]} />
        <meshStandardMaterial color="#1f2933" roughness={0.45} metalness={0.7} />
      </mesh>

      {/* Angled Solar Roof Canopy */}
      <group position={[0, 2.72, 0]} rotation={[0.16, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.14, 3.2]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[3.3, 0.02, 2.9]} />
          <meshStandardMaterial map={solarTex} roughness={0.22} metalness={0.85} />
        </mesh>
      </group>

      {/* Power Inverter Cabinet & Status Beacon */}
      <mesh position={[1.45, 0.85, 1.1]} castShadow>
        <boxGeometry args={[0.55, 1.4, 0.65]} />
        <meshStandardMaterial color="#0f291e" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[1.45, 1.72, 1.1]}>
        <cylinderGeometry args={[0.14, 0.14, 0.28, 12]} />
        <meshStandardMaterial
          ref={beaconMatRef}
          color="#a3e635"
          emissive="#a3e635"
          emissiveIntensity={1.1}
          roughness={0.2}
        />
      </mesh>

      {/* Animated Charging Energy Ring */}
      <mesh
        ref={energyRingRef}
        position={[0, 0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <torusGeometry args={[1.1, 0.045, 10, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} />
      </mesh>

      {/* Standby Queue Ground Marker */}
      <mesh
        position={[
          station.waitPosition.x - station.position.x,
          0.035,
          station.waitPosition.z - station.position.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.7, 0.82, 4]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export function ChargingStations() {
  const stations = useMemo(() => simulation.world.stations, []);
  return (
    <group>
      {stations.map((st, i) => (
        <StationUnit key={st.id} station={st} index={i} />
      ))}
    </group>
  );
}
