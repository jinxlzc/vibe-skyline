import { useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Geometry } from "@vibeskyline/geometry";
import type { BuildPlan } from "@vibeskyline/contracts";
function Region({ mesh, color }: { mesh: Geometry["mono"]; color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(mesh.vertices, 3),
    );
    g.setIndex(mesh.triangles);
    g.computeVertexNormals();
    return g;
  }, [mesh]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        flatShading
        color={color}
        roughness={0.72}
        metalness={0.02}
      />
    </mesh>
  );
}
function FitCamera({ plan }: { plan: BuildPlan }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(
        (size.width / (plan.width + plan.depth * .3)) * .82,
        (size.height / (plan.height + plan.depth)) * .65,
      );
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, plan.width, plan.depth, invalidate]);
  return null;
}
export default function Scene({
  geometry,
  plan,
}: {
  geometry?: Geometry;
  plan: BuildPlan;
}) {
  return (
    <Canvas
      frameloop="demand"
      orthographic
      shadows
      camera={{
        position: [72, -210, 100],
        zoom: 3.1,
        near: 0.1,
        far: 2000,
        up: [0, 0, 1],
      }}
      dpr={[1, 1.7]}
      gl={{ antialias: true }}
    >
      <FitCamera plan={plan} />
      <ambientLight intensity={1.3} />
      <directionalLight
        position={[-80, -120, 220]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-far={700}
      />
      <directionalLight position={[120, 80, 140]} intensity={1.6} />
      <group position={[-plan.width / 2, -plan.depth / 2, 0]}>
        {geometry ? (
          geometry.regions.map((r) => <Region key={r.color} {...r} />)
        ) : (
          <mesh position={[plan.width / 2, plan.depth / 2, 1.6]}>
            <boxGeometry args={[plan.width, plan.depth, 3.2]} />
            <meshStandardMaterial color={plan.recipe.baseColor} />
          </mesh>
        )}
      </group>
      <ContactShadows
        frames={1}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.2]}
        scale={500}
        far={80}
        opacity={0.22}
        blur={2.5}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minZoom={1.1}
        maxZoom={14}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.03}
      />
    </Canvas>
  );
}
