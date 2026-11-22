import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { simulation, useSimStore } from '../../store/useSimStore';
import { createContactShadowTexture, createSolarPanelTexture } from './materials';
import { RobotFSMState } from '../../simulation/types';

function stateToColor(state: RobotFSMState): string {
  switch (state) {
    case 'HARVESTING':
      return '#a3e635';
    case 'SAFETY_STOP':
      return '#f43f5e';
    case 'RELOCALIZING':
      return '#a78bfa';
    case 'AVOIDING':
    case 'RECOVERING':
      return '#f59e0b';
    case 'RETURNING':
    case 'CHARGING':
      return '#38bdf8';
    case 'MOVING':
    case 'EXPLORING':
      return '#22d3ee';
    default:
      return '#94a3b8';
  }
}

export function RobotMesh({ index }: { index: number }) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  const solarTex = useMemo(() => createSolarPanelTexture(maxAniso), [maxAniso]);

  // Beveled chassis profile via ExtrudeGeometry
  const hullGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.55, -0.78);
    shape.lineTo(0.55, -0.78);
    shape.lineTo(0.62, 0.35);
    shape.lineTo(0.42, 0.82);
    shape.lineTo(-0.42, 0.82);
    shape.lineTo(-0.62, 0.35);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    geo.rotateX(Math.PI / 2);
    geo.center();
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      shadowTex.dispose();
      solarTex.dispose();
      hullGeo.dispose();
    };
  }, [shadowTex, solarTex, hullGeo]);

  const rootRef = useRef<THREE.Group>(null);
  const flWheelSteerRef = useRef<THREE.Group>(null);
  const frWheelSteerRef = useRef<THREE.Group>(null);
  const wheelSpinRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const lidarRef = useRef<THREE.Mesh>(null);
  const cutterArmRef = useRef<THREE.Group>(null);
  const cutterDrumRef = useRef<THREE.Mesh>(null);
  const harvestBeamRef = useRef<THREE.Mesh>(null);
  const beaconMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const batteryBarRef = useRef<THREE.Mesh>(null);
  const batteryMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);

  const selectedRobotId = useSimStore((s) => s.selectedRobotId);
  const selectRobot = useSimStore((s) => s.selectRobot);

  const initialRobot = simulation.world.robots[index];
  const isSelected = selectedRobotId === initialRobot.id;

  useFrame(({ clock }) => {
    const robot = simulation.world.robots[index];
    if (!robot || !rootRef.current) return;

    const t = clock.getElapsedTime();

    // Sync world transform smoothly
    rootRef.current.position.set(robot.position.x, 0, robot.position.z);
    rootRef.current.rotation.y = robot.heading;

    // Front wheel steering
    if (flWheelSteerRef.current) flWheelSteerRef.current.rotation.y = robot.steeringAngle;
    if (frWheelSteerRef.current) frWheelSteerRef.current.rotation.y = robot.steeringAngle;

    // Wheel rotation
    for (const w of wheelSpinRefs.current) {
      if (w) w.rotation.x = robot.wheelRotation;
    }

    // Spinning LiDAR dome
    if (lidarRef.current) {
      lidarRef.current.rotation.y = t * 5.2 + index;
    }

    // Articulated harvesting cutter animation
    const isHarvesting = robot.state === 'HARVESTING';
    if (cutterArmRef.current) {
      const targetPitch = isHarvesting ? 0.28 : -0.15;
      cutterArmRef.current.rotation.x = THREE.MathUtils.lerp(
        cutterArmRef.current.rotation.x,
        targetPitch,
        0.18
      );
    }
    if (cutterDrumRef.current) {
      if (isHarvesting) {
        cutterDrumRef.current.rotation.x += 0.35;
      }
    }
    if (harvestBeamRef.current) {
      harvestBeamRef.current.visible = isHarvesting;
      if (isHarvesting) {
        const s = 0.9 + Math.sin(t * 24) * 0.14;
        harvestBeamRef.current.scale.set(s, 1, s);
      }
    }

    // State beacon color
    if (beaconMatRef.current) {
      const col = stateToColor(robot.state);
      beaconMatRef.current.color.set(col);
      beaconMatRef.current.emissive.set(col);
      beaconMatRef.current.emissiveIntensity =
        robot.state === 'CHARGING' ? 1.5 + Math.sin(t * 6) * 0.5 : 1.3;
    }

    // Battery LED bar width & tint
    if (batteryBarRef.current && batteryMatRef.current) {
      const pct = Math.max(0.05, robot.battery / 100);
      batteryBarRef.current.scale.z = pct;
      const barColor =
        robot.battery > 45 ? '#a3e635' : robot.battery > 24 ? '#fbbf24' : '#ef4444';
      batteryMatRef.current.color.set(barColor);
    }

    // Selection ring pulse
    if (selectRingRef.current) {
      selectRingRef.current.visible = selectedRobotId === robot.id;
      if (selectRingRef.current.visible) {
        const pulse = 1 + Math.sin(t * 4) * 0.06;
        selectRingRef.current.scale.set(pulse, pulse, 1);
      }
    }
  });

  const accent = initialRobot.accentColor;

  return (
    <group
      ref={rootRef}
      position={[initialRobot.position.x, 0, initialRobot.position.z]}
      rotation={[0, initialRobot.heading, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectRobot(initialRobot.id);
      }}
    >
      {/* Invisible expanded click hitbox for easy selection */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.9, 1.5, 2.3]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Contact shadow grounding quad */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 2.7]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.62} />
      </mesh>

      {/* Selected indicator ring */}
      <mesh
        ref={selectRingRef}
        position={[0, 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={isSelected}
      >
        <ringGeometry args={[1.15, 1.34, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>

      {/* Main Chassis Hull (Beveled ExtrudeGeometry) */}
      <mesh geometry={hullGeo} position={[0, 0.48, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#182a20" roughness={0.42} metalness={0.62} />
      </mesh>

      {/* Accent Roll-Armor Side Trim */}
      <mesh position={[0, 0.67, -0.05]} castShadow>
        <boxGeometry args={[1.12, 0.08, 1.35]} />
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.45} />
      </mesh>

      {/* Rear Grain Hopper */}
      <mesh position={[0, 0.78, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[0.88, 0.36, 0.62]} />
        <meshStandardMaterial color="#273d31" roughness={0.55} metalness={0.35} />
      </mesh>

      {/* Solar Deck */}
      <mesh position={[0, 0.74, 0.18]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.78, 0.04, 0.56]} />
        <meshStandardMaterial map={solarTex} roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Side Battery Pack + Live Charge Bar */}
      <mesh position={[0.62, 0.48, -0.1]} castShadow>
        <boxGeometry args={[0.1, 0.24, 0.78]} />
        <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.3} />
      </mesh>
      <mesh ref={batteryBarRef} position={[0.68, 0.48, -0.1]}>
        <boxGeometry args={[0.02, 0.1, 0.68]} />
        <meshBasicMaterial ref={batteryMatRef} color="#a3e635" />
      </mesh>

      {/* Telemetry Mast + Rotating LiDAR Turret + State Beacon */}
      <mesh position={[0, 0.96, 0.25]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.44, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh ref={lidarRef} position={[0, 1.2, 0.25]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.22} metalness={0.85} />
      </mesh>
      <mesh position={[0, 1.32, 0.25]}>
        <sphereGeometry args={[0.085, 12, 10]} />
        <meshStandardMaterial
          ref={beaconMatRef}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.3}
          roughness={0.2}
        />
      </mesh>

      {/* Front Articulated Rotary Harvester Cutter Head */}
      <group ref={cutterArmRef} position={[0, 0.38, 0.82]}>
        {/* Dual Support Arms */}
        <mesh position={[-0.36, 0, 0.24]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.52]} />
          <meshStandardMaterial color="#64748b" roughness={0.35} metalness={0.78} />
        </mesh>
        <mesh position={[0.36, 0, 0.24]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.52]} />
          <meshStandardMaterial color="#64748b" roughness={0.35} metalness={0.78} />
        </mesh>
        {/* Rotary Cutter Drum */}
        <mesh
          ref={cutterDrumRef}
          position={[0, -0.02, 0.48]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.14, 0.14, 0.95, 10]} />
          <meshStandardMaterial color={accent} roughness={0.35} metalness={0.65} />
        </mesh>
        {/* Active Harvest Energy Cone */}
        <mesh ref={harvestBeamRef} position={[0, -0.18, 0.52]} visible={false}>
          <coneGeometry args={[0.42, 0.45, 14, 1, true]} />
          <meshBasicMaterial
            color="#a3e635"
            transparent
            opacity={0.32}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 4 Articulated Agricultural Wheels */}
      {/* Front Left (Steers) */}
      <group ref={flWheelSteerRef} position={[-0.68, 0.28, 0.56]}>
        <group
          ref={(el) => {
            wheelSpinRefs.current[0] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.2, 14]} />
            <meshStandardMaterial color="#1c1f21" roughness={0.88} metalness={0.1} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.22, 8]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Front Right (Steers) */}
      <group ref={frWheelSteerRef} position={[0.68, 0.28, 0.56]}>
        <group
          ref={(el) => {
            wheelSpinRefs.current[1] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.2, 14]} />
            <meshStandardMaterial color="#1c1f21" roughness={0.88} metalness={0.1} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.22, 8]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Rear Left */}
      <group position={[-0.7, 0.3, -0.54]}>
        <group
          ref={(el) => {
            wheelSpinRefs.current[2] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.24, 14]} />
            <meshStandardMaterial color="#1c1f21" roughness={0.88} metalness={0.1} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.26, 8]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Rear Right */}
      <group position={[0.7, 0.3, -0.54]}>
        <group
          ref={(el) => {
            wheelSpinRefs.current[3] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.24, 14]} />
            <meshStandardMaterial color="#1c1f21" roughness={0.88} metalness={0.1} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.26, 8]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
