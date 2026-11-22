import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { simulation, useSimStore } from '../../store/useSimStore';
import { CELL_SIZE, FIELD_HALF_SIZE, GRID_SIZE } from '../../simulation/worldConfig';

const MAX_PATH_POINTS = 64;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function TelemetryOverlays() {
  const showSensors = useSimStore((s) => s.showSensors);
  const showPaths = useSimStore((s) => s.showPaths);
  const debugMode = useSimStore((s) => s.debugMode);

  // Pre-allocated path Line geometries (1 per robot)
  const pathLines = useMemo(() => {
    return simulation.world.robots.map((r) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(MAX_PATH_POINTS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: r.accentColor,
        transparent: true,
        opacity: 0.88,
      });
      return new THREE.Line(geo, mat);
    });
  }, []);

  useEffect(() => {
    return () => {
      pathLines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    };
  }, [pathLines]);

  const sensorRingRefs = useRef<(THREE.Group | null)[]>([null, null, null]);
  const avoidArcRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const debugGridRef = useRef<THREE.InstancedMesh>(null);
  const totalCells = GRID_SIZE * GRID_SIZE;

  useFrame(() => {
    const world = simulation.world;

    // 1. Update A* path lines
    for (let i = 0; i < world.robots.length; i++) {
      const robot = world.robots[i];
      const line = pathLines[i];
      line.visible = showPaths && robot.path.length > 0;
      if (line.visible) {
        const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const pts = [robot.position, ...robot.path];
        const count = Math.min(pts.length, MAX_PATH_POINTS);
        for (let p = 0; p < count; p++) {
          attr.setXYZ(p, pts[p].x, 0.16, pts[p].z);
        }
        attr.needsUpdate = true;
        line.geometry.setDrawRange(0, count);
      }

      // 2. Update sensor rings & avoidance cones
      const sGroup = sensorRingRefs.current[i];
      if (sGroup) {
        sGroup.visible = showSensors;
        sGroup.position.set(robot.position.x, 0.08, robot.position.z);
        sGroup.rotation.y = robot.heading;
        const radScale = robot.effectiveSensorRadius / Math.max(0.1, robot.sensorRadius);
        sGroup.scale.set(radScale, 1, radScale);
      }

      const avoidMesh = avoidArcRefs.current[i];
      if (avoidMesh) {
        avoidMesh.visible = robot.state === 'AVOIDING' || robot.state === 'RECOVERING';
      }
    }

    // 3. Update Debug Mode occupancy & exploration grid
    if (debugMode && debugGridRef.current) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const idx = r * GRID_SIZE + c;
          const x = -FIELD_HALF_SIZE + (c + 0.5) * CELL_SIZE;
          const z = -FIELD_HALF_SIZE + (r + 0.5) * CELL_SIZE;
          const isBlocked = world.blockedGrid[idx] === 1;
          const isExplored = world.exploredGrid[idx] === 1;

          _dummy.position.set(x, 0.075, z);
          _dummy.rotation.set(-Math.PI / 2, 0, 0);
          _dummy.scale.set(0.86, 0.86, 1);
          _dummy.updateMatrix();
          debugGridRef.current.setMatrixAt(idx, _dummy.matrix);

          if (isBlocked) {
            _color.set('#ef4444');
          } else if (isExplored) {
            _color.set('#22d3ee');
          } else {
            _color.set('#1e293b');
          }
          debugGridRef.current.setColorAt(idx, _color);
        }
      }
      debugGridRef.current.instanceMatrix.needsUpdate = true;
      if (debugGridRef.current.instanceColor) {
        debugGridRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* A* Navigation Paths */}
      {pathLines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}

      {/* Sensor Radii & Forward Avoidance Warning Cones */}
      {simulation.world.robots.map((robot, i) => (
        <group
          key={robot.id}
          ref={(el) => {
            sensorRingRefs.current[i] = el;
          }}
        >
          {/* Outer LiDAR Perimeter */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[robot.sensorRadius - 0.08, robot.sensorRadius, 48]} />
            <meshBasicMaterial color={robot.accentColor} transparent opacity={0.28} />
          </mesh>
          {/* Forward Sensor Cone */}
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2 - 0.52]}>
            <ringGeometry args={[0.9, robot.sensorRadius * 0.55, 18, 1, 0, 1.04]} />
            <meshBasicMaterial color={robot.accentColor} transparent opacity={0.07} />
          </mesh>
          {/* Avoidance / Recovery Alert Cone */}
          <mesh
            ref={(el) => {
              avoidArcRefs.current[i] = el;
            }}
            rotation={[-Math.PI / 2, 0, Math.PI / 2 - 0.65]}
            visible={false}
          >
            <ringGeometry args={[0.9, 3.8, 16, 1, 0, 1.3]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}

      {/* Debug A* & Fog-of-War Grid Overlay */}
      <instancedMesh
        ref={debugGridRef}
        args={[undefined, undefined, totalCells]}
        visible={debugMode}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.28} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
