import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { simulation, useSimStore } from '../../store/useSimStore';
import { IS_SOFTWARE_GL } from './materials';

const _targetPos = new THREE.Vector3();
const _camGoal = new THREE.Vector3();

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraMode = useSimStore((s) => s.cameraMode);
  const selectedRobotId = useSimStore((s) => s.selectedRobotId);
  const phase = useSimStore((s) => s.phase);

  // One-shot smooth camera preset transition flag (cleared on arrival or user drag)
  const presetPending = useRef(true);
  const prevMode = useRef(cameraMode);

  useEffect(() => {
    if (prevMode.current !== cameraMode) {
      prevMode.current = cameraMode;
      presetPending.current = true;
    }
  }, [cameraMode]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const controls = controlsRef.current;
    if (!controls) return;

    // Gentle panoramic showcase orbit while on Briefing Title Overlay
    if (phase === 'briefing') {
      controls.autoRotate = !IS_SOFTWARE_GL;
      controls.autoRotateSpeed = 0.55;
      controls.update();
      return;
    }

    controls.autoRotate = false;

    if (cameraMode === 'follow') {
      const robot =
        simulation.world.robots.find((r) => r.id === selectedRobotId) ??
        simulation.world.robots[0];

      _targetPos.set(robot.position.x, 0.6, robot.position.z);
      controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetPos.x, 5.5, dt);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetPos.y, 5.5, dt);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetPos.z, 5.5, dt);

      const backDist = 11.5;
      _camGoal.set(
        robot.position.x - Math.sin(robot.heading) * backDist * 0.55,
        8.5,
        robot.position.z - Math.cos(robot.heading) * backDist * 0.55 + 5.5
      );
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 3.2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 3.2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 3.2, dt);
      controls.update();
      return;
    }

    if (presetPending.current) {
      if (cameraMode === 'isometric') {
        _camGoal.set(32, 31, 32);
        _targetPos.set(0, 0, -1);
      } else {
        // Full farm overview
        _camGoal.set(0, 26, 36);
        _targetPos.set(0, 0, -1);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 4.8, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 4.8, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 4.8, dt);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetPos.x, 5.5, dt);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetPos.y, 5.5, dt);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetPos.z, 5.5, dt);

      if (camera.position.distanceTo(_camGoal) < 0.25) {
        presetPending.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!IS_SOFTWARE_GL}
      dampingFactor={0.07}
      minDistance={8}
      maxDistance={72}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.12}
      onStart={() => {
        presetPending.current = false;
      }}
    />
  );
}
