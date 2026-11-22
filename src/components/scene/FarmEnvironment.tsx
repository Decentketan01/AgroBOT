import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  createGrassTexture,
  createGravelRoadTexture,
  createSoilTexture,
} from './materials';
import { FIELD_HALF_SIZE } from '../../simulation/worldConfig';

const TREE_COUNT = 56;

export function FarmEnvironment() {
  const { gl } = useThree();
  const maxAniso = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);

  const grassTex = useMemo(() => createGrassTexture(maxAniso), [maxAniso]);
  const soilTex = useMemo(() => createSoilTexture(maxAniso), [maxAniso]);
  const roadTex = useMemo(() => createGravelRoadTexture(maxAniso), [maxAniso]);

  useEffect(() => {
    return () => {
      grassTex.dispose();
      soilTex.dispose();
      roadTex.dispose();
    };
  }, [grassTex, soilTex, roadTex]);

  // Procedural perimeter hills beyond the 44x44m farm field
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(240, 240, 72, 72);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distOutside = Math.max(
        Math.abs(x) - (FIELD_HALF_SIZE + 5),
        Math.abs(z) - (FIELD_HALF_SIZE + 5),
        0
      );
      if (distOutside > 0) {
        const wave =
          Math.sin(x * 0.065) * Math.cos(z * 0.055) * 1.8 +
          Math.sin(x * 0.14 + z * 0.11) * 0.55;
        const rise = Math.min(10, distOutside * 0.13) + wave * Math.min(1, distOutside * 0.08);
        pos.setY(i, Math.max(-0.2, rise));
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Instanced perimeter trees
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyLowRef = useRef<THREE.InstancedMesh>(null);
  const canopyTopRef = useRef<THREE.InstancedMesh>(null);

  const treeTransforms = useMemo(() => {
    const list: { x: number; y: number; z: number; scale: number; tint: string }[] = [];
    const palette = ['#2d6a34', '#387d3c', '#255a2c', '#458b42'];
    for (let i = 0; i < TREE_COUNT; i++) {
      const angle = (i / TREE_COUNT) * Math.PI * 2 + (i % 3) * 0.04;
      const radius = 29 + (i % 5) * 4.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Leave clean sightline on southern camera approach
      if (z > 24 && Math.abs(x) < 16) continue;
      const distOutside = Math.max(Math.abs(x) - 27, Math.abs(z) - 27, 0);
      const y = Math.max(0, Math.min(3.5, distOutside * 0.12));
      const scale = 0.85 + ((i * 19) % 10) * 0.04;
      list.push({ x, y, z, scale, tint: palette[i % palette.length] });
    }
    return list;
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    treeTransforms.forEach((t, i) => {
      // Trunk
      dummy.position.set(t.x, t.y + 1.0 * t.scale, t.z);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);

      // Lower foliage cone/cluster
      dummy.position.set(t.x, t.y + 2.5 * t.scale, t.z);
      dummy.scale.set(t.scale * 1.15, t.scale * 1.1, t.scale * 1.15);
      dummy.updateMatrix();
      canopyLowRef.current?.setMatrixAt(i, dummy.matrix);
      color.set(t.tint);
      canopyLowRef.current?.setColorAt(i, color);

      // Upper foliage tier
      dummy.position.set(t.x, t.y + 3.65 * t.scale, t.z);
      dummy.scale.set(t.scale * 0.8, t.scale * 0.9, t.scale * 0.8);
      dummy.updateMatrix();
      canopyTopRef.current?.setMatrixAt(i, dummy.matrix);
      color.set(t.tint).offsetHSL(0.01, 0.03, 0.04);
      canopyTopRef.current?.setColorAt(i, color);
    });

    if (trunkRef.current) {
      trunkRef.current.instanceMatrix.needsUpdate = true;
      trunkRef.current.computeBoundingSphere();
    }
    if (canopyLowRef.current) {
      canopyLowRef.current.instanceMatrix.needsUpdate = true;
      if (canopyLowRef.current.instanceColor) canopyLowRef.current.instanceColor.needsUpdate = true;
      canopyLowRef.current.computeBoundingSphere();
    }
    if (canopyTopRef.current) {
      canopyTopRef.current.instanceMatrix.needsUpdate = true;
      if (canopyTopRef.current.instanceColor) canopyTopRef.current.instanceColor.needsUpdate = true;
      canopyTopRef.current.computeBoundingSphere();
    }
  }, [treeTransforms]);

  // Fence posts around 44x44m perimeter
  const fencePosts = useMemo(() => {
    const posts: [number, number][] = [];
    const step = 4;
    for (let v = -22; v <= 22; v += step) {
      posts.push([v, -22]);
      posts.push([v, 22]);
      if (Math.abs(v) < 22) {
        posts.push([-22, v]);
        posts.push([22, v]);
      }
    }
    return posts;
  }, []);

  return (
    <group>
      {/* Extended rolling farmland terrain */}
      <mesh geometry={terrainGeo} receiveShadow position={[0, 0, 0]}>
        <meshStandardMaterial map={grassTex} roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Gravel farm perimeter & cross-roads (offset +0.02m on Y with polygonOffset) */}
      <group position={[0, 0.02, 0]}>
        {/* South service road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[42, 4.2]} />
          <meshStandardMaterial
            map={roadTex}
            roughness={0.88}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        {/* Position south road at z=13.5 */}
        <mesh position={[0, 0, 14.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[41, 7.5]} />
          <meshStandardMaterial
            color="#4c5550"
            roughness={0.82}
            metalness={0.08}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        {/* North perimeter road */}
        <mesh position={[0, 0, -17.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[41, 3.4]} />
          <meshStandardMaterial
            map={roadTex}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        {/* Central east-west tractor lane */}
        <mesh position={[0, 0, 3.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[38, 2.2]} />
          <meshStandardMaterial
            map={roadTex}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        {/* West-center and East-center north-south access lanes */}
        <mesh position={[-7.0, 0, -3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.3, 30]} />
          <meshStandardMaterial
            map={roadTex}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        <mesh position={[7.0, 0, -3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.3, 30]} />
          <meshStandardMaterial
            map={roadTex}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      </group>

      {/* 3 Raised Tilled Agricultural Soil Beds (Y = 0.045) */}
      {[
        { x: -13.0, z: -3.5, w: 9.2, d: 24.5 }, // Plot-West
        { x: 0.0, z: -5.2, w: 9.8, d: 21.0 },   // Plot-Center
        { x: 13.0, z: -3.5, w: 9.2, d: 24.5 },  // Plot-East
      ].map((plot, idx) => (
        <mesh key={idx} position={[plot.x, 0.045, plot.z]} receiveShadow>
          <boxGeometry args={[plot.w, 0.06, plot.d]} />
          <meshStandardMaterial map={soilTex} roughness={0.95} metalness={0.02} />
        </mesh>
      ))}

      {/* Field Perimeter Fence Posts + Rails */}
      <group>
        {fencePosts.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.45, z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.9, 6]} />
            <meshStandardMaterial color="#5c432d" roughness={0.88} />
          </mesh>
        ))}
        {/* Top fence rails */}
        <mesh position={[0, 0.7, -22]} castShadow>
          <boxGeometry args={[44, 0.08, 0.08]} />
          <meshStandardMaterial color="#73553b" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.7, 22]} castShadow>
          <boxGeometry args={[44, 0.08, 0.08]} />
          <meshStandardMaterial color="#73553b" roughness={0.85} />
        </mesh>
        <mesh position={[-22, 0.7, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, 44]} />
          <meshStandardMaterial color="#73553b" roughness={0.85} />
        </mesh>
        <mesh position={[22, 0.7, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, 44]} />
          <meshStandardMaterial color="#73553b" roughness={0.85} />
        </mesh>
      </group>

      {/* Instanced Perimeter Trees */}
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, treeTransforms.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.18, 0.28, 2.0, 7]} />
        <meshStandardMaterial color="#523826" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={canopyLowRef}
        args={[undefined, undefined, treeTransforms.length]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[1.45, 2.4, 7]} />
        <meshStandardMaterial roughness={0.82} />
      </instancedMesh>
      <instancedMesh
        ref={canopyTopRef}
        args={[undefined, undefined, treeTransforms.length]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[1.15, 2.1, 7]} />
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>

      {/* Scenic Distant Farm Barn & Silo beyond northern fence */}
      <group position={[-10, 0, -34]}>
        <mesh position={[0, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.5, 4.8, 5.5]} />
          <meshStandardMaterial color="#8f3228" roughness={0.78} />
        </mesh>
        <mesh position={[0, 5.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[5.8, 2.6, 4]} />
          <meshStandardMaterial color="#2d3b34" roughness={0.65} metalness={0.2} />
        </mesh>
        {/* Grain Silo */}
        <mesh position={[5.6, 3.8, -0.5]} castShadow receiveShadow>
          <cylinderGeometry args={[1.6, 1.6, 7.6, 16]} />
          <meshStandardMaterial color="#b9c4c9" roughness={0.35} metalness={0.75} />
        </mesh>
        <mesh position={[5.6, 8.0, -0.5]} castShadow>
          <sphereGeometry args={[1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#cfd9de" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
