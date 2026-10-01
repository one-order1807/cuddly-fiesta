"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import { drawScreen, setScreenFonts } from "./screens";
import { scrollState } from "./state";

/** Camera/object keyframes keyed to scroll progress (0..1) across the pinned story. */
type Key = { p: number; cam: [number, number, number]; look: [number, number, number]; rotY: number; rotX: number; explode: number; print: number };
const KEYS: Key[] = [
  { p: 0.0, cam: [0, 0.15, 9.6], look: [-1.9, 0, 0], rotY: -0.5, rotX: 0.1, explode: 0, print: 0 },
  { p: 0.17, cam: [0, 0.05, 6.4], look: [-0.9, 0, 0], rotY: -0.12, rotX: 0.04, explode: 0, print: 0 },
  { p: 0.39, cam: [0.6, 0.0, 7.4], look: [0.2, -0.15, 0], rotY: 0.3, rotX: 0.02, explode: 0, print: 0.6 },
  { p: 0.5, cam: [0.6, 0.1, 7.6], look: [0.1, -0.1, 0], rotY: 0.25, rotX: 0.03, explode: 0, print: 1 },
  { p: 0.61, cam: [0, 0.5, 9.4], look: [-0.5, 0, 0], rotY: 0.85, rotX: 0.16, explode: 1, print: 1 },
  { p: 0.72, cam: [0, 0.2, 7.0], look: [-0.9, 0, 0], rotY: 0.3, rotX: 0.06, explode: 0, print: 1 },
  { p: 0.83, cam: [0, 0.1, 6.6], look: [-0.9, 0, 0], rotY: -0.08, rotX: 0.03, explode: 0, print: 1 },
  { p: 1.0, cam: [0, 0.1, 6.6], look: [-0.9, 0, 0], rotY: -0.08, rotX: 0.03, explode: 0, print: 1 },
];
const LAYER_Z = [0, 0.09, 0.13];
const ease = (t: number) => t * t * (3 - 2 * t);

function sample(p: number) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const t = b.p === a.p ? 0 : ease((p - a.p) / (b.p - a.p));
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    cam: [l(a.cam[0], b.cam[0]), l(a.cam[1], b.cam[1]), l(a.cam[2], b.cam[2])] as const,
    look: [l(a.look[0], b.look[0]), l(a.look[1], b.look[1]), l(a.look[2], b.look[2])] as const,
    rotY: l(a.rotY, b.rotY), rotX: l(a.rotX, b.rotX), explode: l(a.explode, b.explode), print: l(a.print, b.print),
  };
}

function useScreenTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1280; c.height = 880;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const stage = useRef(-1);
  // Web fonts load async; repaint the screen once they are ready so the UI doesn't keep fallback type.
  useEffect(() => { document.fonts?.ready.then(() => { stage.current = -1; }); }, []);
  const redraw = (s: number) => {
    if (stage.current === s) return;
    stage.current = s;
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-serif").trim();
    setScreenFonts(getComputedStyle(document.body).fontFamily, serif || "Georgia, serif");
    const c = tex.image as HTMLCanvasElement;
    drawScreen(c.getContext("2d")!, c.width, c.height, "ordering", s);
    tex.needsUpdate = true;
  };
  return { tex, redraw };
}

function useReceiptTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 640;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 640);
    g.fillStyle = "#0f172a"; g.textBaseline = "middle";
    g.font = "700 22px ui-monospace, monospace"; g.textAlign = "center"; g.fillText("COOK BILL", 128, 40);
    g.font = "500 16px ui-monospace, monospace"; g.fillStyle = "#475569"; g.fillText("Table 5 · Round 2", 128, 70);
    g.fillStyle = "#0f172a"; g.textAlign = "left"; g.font = "600 24px ui-monospace, monospace";
    ["Dosa  x2", "Tea   x5"].forEach((t, i) => g.fillText(t, 30, 140 + i * 44));
    g.fillStyle = "#cbd5e1"; for (let x = 20; x < 236; x += 12) g.fillRect(x, 230, 6, 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Steam({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) { seeds[i] = Math.random(); }
    return { positions, seeds };
  }, [count]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const s = seeds[i], k = (t * 0.16 + s) % 1;
      positions[i * 3] = Math.sin(t * 0.8 + s * 20) * 0.1 * k + (s - 0.5) * 0.18;
      positions[i * 3 + 1] = k * 1.2;
      positions[i * 3 + 2] = Math.cos(t * 0.6 + s * 12) * 0.08 * k;
    }
    const g = ref.current!.geometry;
    g.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} position={[-2.35, -0.7, 0.2]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#9db8ff" transparent opacity={0.38} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Rig({ particles }: { particles: number }) {
  const group = useRef<THREE.Group>(null);
  const layers = useRef<THREE.Group[]>([]);
  const parts = useRef<THREE.Group>(null);
  const paper = useRef<THREE.Mesh>(null);
  const cur = useRef({ ...sample(0), cam: [...sample(0).cam] as number[], look: [...sample(0).look] as number[] });
  const { tex, redraw } = useScreenTexture();
  const receipt = useReceiptTexture();
  const camera = useThree((s) => s.camera);
  const lookAt = useRef(new THREE.Vector3());

  useEffect(() => () => { tex.dispose(); receipt.dispose(); }, [tex, receipt]);

  useFrame((state, dt) => {
    const p = scrollState.p;
    const s = sample(p);
    const d = THREE.MathUtils.damp;
    const c = cur.current as unknown as { cam: number[]; look: number[]; rotY: number; rotX: number; explode: number; print: number };
    for (let i = 0; i < 3; i++) { c.cam[i] = d(c.cam[i], s.cam[i], 4, dt); c.look[i] = d(c.look[i], s.look[i], 4, dt); }
    c.rotY = d(c.rotY, s.rotY, 4, dt); c.rotX = d(c.rotX, s.rotX, 4, dt);
    c.explode = d(c.explode, s.explode, 4, dt); c.print = d(c.print, s.print, 3, dt);

    // subtle pointer parallax on top of the scripted camera
    const asp = state.size.width / state.size.height;
    const portrait = asp < 1;
    const zMul = portrait ? 1 + (1 - asp) * 2.6 : 1;
    const heroDrop = portrait ? Math.max(0, 1 - p / 0.12) * 1.7 : 0; // phone: park the tablet under the hero copy
    const lx = portrait ? c.look[0] * 0.25 : c.look[0];
    const px = state.pointer.x * 0.25, py = state.pointer.y * 0.15;
    camera.position.set(c.cam[0] + px, c.cam[1] + py, c.cam[2] * zMul);
    lookAt.current.set(lx, c.look[1] + heroDrop, c.look[2]);
    camera.lookAt(lookAt.current);

    if (group.current) { group.current.rotation.y = c.rotY; group.current.rotation.x = c.rotX; }
    // exploded view: separate layers along z
    layers.current.forEach((l, i) => { if (l) l.position.z = LAYER_Z[i] + (i - 1) * 0.9 * c.explode; });
    if (parts.current) { parts.current.visible = c.explode > 0.02; parts.current.scale.setScalar(Math.min(1, c.explode * 1.2)); }
    if (paper.current) { paper.current.scale.y = Math.max(0.001, c.print); paper.current.position.y = -0.34 - c.print * 0.62; }
    redraw(p > 0.78 ? 2 : p > 0.1 ? 1 : 0);
  });

  const setLayer = (i: number) => (el: THREE.Group | null) => { if (el) layers.current[i] = el; };

  return (
    <>
      <group ref={group}>
        <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.35}>
          {/* layer 0: back body */}
          <group ref={setLayer(0)}>
            <RoundedBox args={[3.9, 2.7, 0.14]} radius={0.14} smoothness={4}>
              <meshStandardMaterial color="#0b1224" metalness={0.85} roughness={0.28} />
            </RoundedBox>
          </group>
          {/* layer 1: display panel with live POS UI */}
          <group ref={setLayer(1)} position={[0, 0, 0.09]}>
            <mesh>
              <planeGeometry args={[3.62, 2.48]} />
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
          </group>
          {/* layer 2: glass */}
          <group ref={setLayer(2)} position={[0, 0, 0.13]}>
            <RoundedBox args={[3.84, 2.64, 0.02]} radius={0.12} smoothness={4}>
              <meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.05} metalness={0} clearcoat={1} />
            </RoundedBox>
          </group>
          {/* internals revealed in the exploded view */}
          <group ref={parts} visible={false}>
            <mesh position={[-0.9, 0.2, 0.45]}><boxGeometry args={[1.2, 0.8, 0.08]} /><meshStandardMaterial color="#16a34a" roughness={0.5} /></mesh>
            <mesh position={[0.8, -0.2, 0.0]}><boxGeometry args={[1.5, 0.9, 0.12]} /><meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} /></mesh>
            <mesh position={[0.2, 0.7, -0.45]}><boxGeometry args={[0.9, 0.35, 0.1]} /><meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.6} /></mesh>
          </group>
        </Float>

        {/* thermal printer */}
        <group position={[2.9, -0.75, 0.2]}>
          <RoundedBox args={[1.25, 0.8, 0.95]} radius={0.1} smoothness={4}>
            <meshStandardMaterial color="#e8eefc" metalness={0.2} roughness={0.35} />
          </RoundedBox>
          <mesh position={[0, 0.2, 0.48]}><boxGeometry args={[0.9, 0.05, 0.02]} /><meshStandardMaterial color="#0b1224" /></mesh>
          <mesh ref={paper} position={[0, -0.34, 0.3]}>
            <planeGeometry args={[0.72, 1.1]} />
            <meshStandardMaterial map={receipt} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </group>

        {/* coffee cup + steam */}
        <group position={[-2.35, -1.3, 0.3]}>
          <mesh>
            <latheGeometry args={[[new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.42, 0.55), new THREE.Vector2(0.4, 0.58), new THREE.Vector2(0.0, 0.52)], 36]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.38, 32]} /><meshStandardMaterial color="#5b3a29" roughness={0.4} /></mesh>
          <mesh position={[0.46, 0.3, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.15, 0.04, 12, 24, Math.PI * 1.4]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
        </group>
        <Steam count={particles} />
      </group>
    </>
  );
}

export default function PosScene({ mobile }: { mobile: boolean }) {
  return (
    <Canvas
      dpr={[1, mobile ? 1.4 : 2]}
      camera={{ fov: 34, position: [0, 0.15, 7.4], near: 0.1, far: 60 }}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 6]} intensity={2.1} color="#dbe7ff" />
      <pointLight position={[-4, -1, 3]} intensity={18} color="#3b82f6" distance={14} />
      {/* offline studio reflections — no HDR download */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#3b82f6" position={[-5, 0, 2]} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[5, 1, -2]} scale={[2, 6, 1]} />
      </Environment>
      <Rig particles={mobile ? 40 : 120} />
    </Canvas>
  );
}
