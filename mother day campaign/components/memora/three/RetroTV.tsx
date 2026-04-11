"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D map;
uniform float uTime;
uniform float uPowered;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float curve = 0.04 * sin(uv.y * 3.14159) + 0.04 * sin(uv.x * 3.14159);
  vec2 bent = uv + curve * (uv - 0.5);
  vec4 color = texture2D(map, bent);
  float scan = sin(bent.y * 900.0) * 0.06 + 0.94;
  float roll = smoothstep(0.0, 0.04, fract(uTime * 0.08 + bent.y));
  float ghost = texture2D(map, bent + vec2(0.003 * sin(uTime * 6.0), 0.0)).r;
  color.rgb = mix(color.rgb, color.rgb * vec3(1.0, 1.05, 1.1), 0.08);
  color.rgb *= scan * roll;
  color.rgb += ghost * 0.04 * vec3(0.2, 1.0, 0.3);
  float vig = smoothstep(1.0, 0.35, length(uv - 0.5));
  color.rgb *= vig;
  color.rgb *= mix(0.12, 1.0, uPowered);
  gl_FragColor = vec4(color.rgb, 1.0);
}
`;

export function RetroTV({
  videoEl,
  powered,
  slide,
}: {
  videoEl: HTMLVideoElement | null;
  powered: boolean;
  slide: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const texture = useMemo(() => {
    if (!videoEl) {
      const data = new Uint8Array([12, 10, 8, 255]);
      const empty = new THREE.DataTexture(data, 1, 1);
      empty.needsUpdate = true;
      return empty;
    }
    const t = new THREE.VideoTexture(videoEl);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, [videoEl]);

  useEffect(() => {
    textureRef.current = texture;
  }, [texture]);

  useLayoutEffect(() => {
    return () => {
      if (texture instanceof THREE.VideoTexture) {
        texture.dispose();
      } else if (texture instanceof THREE.DataTexture) {
        texture.dispose();
      }
    };
  }, [texture]);

  useFrame(({ clock }) => {
    const tex = textureRef.current;
    if (tex instanceof THREE.VideoTexture) tex.needsUpdate = true;
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = clock.elapsedTime;
    m.uniforms.uPowered.value = THREE.MathUtils.lerp(m.uniforms.uPowered.value, powered ? 1 : 0, 0.08);
    m.uniforms.map.value = tex ?? texture;
  });

  const x = THREE.MathUtils.lerp(5.5, 0, slide);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, -0.35, -0.45]}>
        <boxGeometry args={[3.4, 2.45, 0.35]} />
        <meshStandardMaterial color="#1a1814" metalness={0.45} roughness={0.42} />
      </mesh>

      <mesh position={[0, 0.25, -0.24]}>
        <boxGeometry args={[2.95, 2.05, 0.2]} />
        <meshStandardMaterial color="#0c0a08" metalness={0.12} roughness={0.88} />
      </mesh>

      <mesh position={[0, 0.25, -0.12]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2.55, 1.75]} />
        <shaderMaterial
          ref={matRef}
          transparent={false}
          uniforms={{
            map: { value: texture },
            uTime: { value: 0 },
            uPowered: { value: 0 },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>

      <mesh position={[0, -0.98, -0.14]}>
        <boxGeometry args={[1.35, 0.22, 0.12]} />
        <meshStandardMaterial color="#12100e" metalness={0.55} roughness={0.35} />
      </mesh>

      <mesh position={[-1.35, -1.05, -0.08]}>
        <boxGeometry args={[0.18, 0.45, 0.24]} />
        <meshStandardMaterial color="#2d2a26" metalness={0.2} roughness={0.55} />
      </mesh>
    </group>
  );
}
