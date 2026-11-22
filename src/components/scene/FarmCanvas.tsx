import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IS_SOFTWARE_GL } from './materials';
import { FarmEnvironment } from './FarmEnvironment';
import { CropField } from './CropField';
import { ChargingStations } from './ChargingStations';
import { RobotMesh } from './RobotMesh';
import { MovingObstacles } from './MovingObstacles';
import { TelemetryOverlays } from './TelemetryOverlays';
import { ScenarioVisuals } from './ScenarioVisuals';
import { CameraRig } from './CameraRig';
import { simulation, useSimStore } from '../../store/useSimStore';
import { soundSynth } from '../../audio/soundSynth';

function StudioEnvironmentSetup() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    return () => {
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
}

function SimulationDriver() {
  const syncSnapshot = useSimStore((s) => s.syncSnapshot);
  const muted = useSimStore((s) => s.muted);
  const syncAccum = useRef(0);

  const prevHarvested = useRef(0);
  const prevAvoids = useRef(0);
  const prevCharges = useRef(0);
  const prevPhase = useRef(simulation.world.phase);

  useEffect(() => {
    soundSynth.setMuted(muted);
  }, [muted]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    simulation.step(dt);

    const w = simulation.world;
    if (w.metrics.cropsHarvested > prevHarvested.current) {
      prevHarvested.current = w.metrics.cropsHarvested;
      soundSynth.playHarvestPop();
    } else if (w.metrics.cropsHarvested < prevHarvested.current) {
      prevHarvested.current = w.metrics.cropsHarvested;
    }

    if (w.metrics.avoidanceEvents > prevAvoids.current) {
      prevAvoids.current = w.metrics.avoidanceEvents;
      soundSynth.playAvoidAlert();
    } else if (w.metrics.avoidanceEvents < prevAvoids.current) {
      prevAvoids.current = w.metrics.avoidanceEvents;
    }

    if (w.metrics.chargingEvents > prevCharges.current) {
      prevCharges.current = w.metrics.chargingEvents;
      soundSynth.playChargeChime();
    } else if (w.metrics.chargingEvents < prevCharges.current) {
      prevCharges.current = w.metrics.chargingEvents;
    }

    if (prevPhase.current !== 'completed' && w.phase === 'completed') {
      soundSynth.playMissionComplete();
    }
    prevPhase.current = w.phase;

    syncAccum.current += dt;
    if (syncAccum.current >= 0.085 || w.phase !== 'running') {
      syncAccum.current = 0;
      syncSnapshot();
    }
  });

  return null;
}

export function FarmCanvas() {
  const [contextLost, setContextLost] = useState(false);
  const scenario = useSimStore((s) => s.scenario);

  return (
    <div className="relative w-full h-full bg-[#8fbcae]">
      {contextLost ? (
        <div className="flex h-full w-full items-center justify-center bg-[#07140d] text-emerald-100">
          <div className="border border-cyan-500/30 bg-[#0b2015] p-6 rounded-lg text-center">
            <h2 className="font-display text-lg font-semibold text-cyan-300">
              WebGL Context Interrupted
            </h2>
            <p className="mt-2 text-sm text-emerald-200/80">
              The 3D viewport is recovering. Click below to reinitialize the farm renderer.
            </p>
            <button
              onClick={() => setContextLost(false)}
              className="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-semibold text-sm rounded"
            >
              Restore 3D Viewport
            </button>
          </div>
        </div>
      ) : (
        <Canvas
          shadows={!IS_SOFTWARE_GL}
          dpr={IS_SOFTWARE_GL ? 1 : [1, 2]}
          camera={{ position: [0, 26, 36], fov: 44, near: 0.5, far: 260 }}
          gl={{
            antialias: !IS_SOFTWARE_GL,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            const dom = gl.domElement;
            dom.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            dom.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <color attach="background" args={['#94c3b4']} />
          <fogExp2 attach="fog" args={['#94c3b4', 0.0082]} />

          <StudioEnvironmentSetup />

          {/* Warm sunlight key + cool sky/ground fill + crisp rim light */}
          <hemisphereLight args={['#c2e9fb', '#2a4224', 0.85]} />
          <directionalLight
            position={[28, 38, 22]}
            intensity={2.1}
            color="#fff1d0"
            castShadow={!IS_SOFTWARE_GL}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-28}
            shadow-camera-right={28}
            shadow-camera-top={28}
            shadow-camera-bottom={-28}
            shadow-camera-near={4}
            shadow-camera-far={105}
            shadow-bias={-0.0005}
            shadow-normalBias={0.02}
          />
          <directionalLight position={[-24, 18, -26]} intensity={0.55} color="#a5f3fc" />

          <FarmEnvironment />
          <CropField key={scenario} />
          <ChargingStations />
          <ScenarioVisuals />
          <RobotMesh index={0} />
          <RobotMesh index={1} />
          <RobotMesh index={2} />
          <MovingObstacles />
          <TelemetryOverlays />
          <CameraRig />
          <SimulationDriver />
        </Canvas>
      )}
    </div>
  );
}
