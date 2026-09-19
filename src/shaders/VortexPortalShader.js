import * as THREE from 'three';

/**
 * VortexPortalShader - Swirling Dimensional Warp Vortex Portal Shader
 *
 * Visual Features:
 *   - Swirling logarithmic spiral vortex pulling in toward singularity
 *   - Chromatic chromatic ring pulsation (golden amber, mystic violet, cyan sparks)
 *   - Procedural simplex noise energy tendrils
 *   - Controllable warp progress (0.0 to 1.0) with expanding event horizon
 */
export class VortexPortalShader {
  /**
   * @returns {THREE.ShaderMaterial}
   */
  static createMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 }, // 0.0 = inactive, 1.0 = full warp
        uColorCore: { value: new THREE.Color(0xfef08a) },   // Brilliant gold core
        uColorMid: { value: new THREE.Color(0xd97706) },    // Amber vortex spiral
        uColorOuter: { value: new THREE.Color(0x7c3aed) }   // Mystic purple rim
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform float uProgress;

        void main() {
          vUv = uv;
          vPosition = position;

          // Subtle pulse displacement along normal
          vec3 pos = position;
          float dist = length(uv - 0.5);
          pos.z += sin(dist * 20.0 - uTime * 6.0) * 0.02 * uProgress;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uProgress;
        uniform vec3 uColorCore;
        uniform vec3 uColorMid;
        uniform vec3 uColorOuter;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vec2 centered = vUv - 0.5;
          float r = length(centered) * 2.0; // 0.0 at center, 1.0 at edge
          float theta = atan(centered.y, centered.x);

          if (r > 1.0 || uProgress <= 0.001) {
            discard;
          }

          // Swirling spiral coordinates
          float twist = 8.0 * (1.0 - r) + uTime * 4.5;
          float spiralAngle = theta + twist;

          // Multilayer spiral arms
          float arm1 = sin(spiralAngle * 3.0);
          float arm2 = cos(spiralAngle * 6.0 - uTime * 2.0);
          float armPattern = (arm1 * 0.6 + arm2 * 0.4 + 1.0) * 0.5;

          // Pulsing energy rings
          float rings = sin(r * 25.0 - uTime * 8.0);
          rings = smoothstep(0.3, 0.9, rings);

          // Color blending from core -> mid -> outer rim
          vec3 color = mix(uColorCore, uColorMid, smoothstep(0.0, 0.45, r));
          color = mix(color, uColorOuter, smoothstep(0.45, 0.95, r));

          // Enhance spiral arms & rings
          color += uColorCore * armPattern * 0.6 * (1.0 - r);
          color += uColorOuter * rings * 0.4;

          // Event horizon outer glow
          float rimGlow = smoothstep(0.7, 1.0, r);
          color += uColorOuter * rimGlow * 1.2;

          // Center singularity brightness
          float coreGlow = 1.0 - smoothstep(0.0, 0.25, r);
          color += uColorCore * coreGlow * 2.0;

          // Alpha fade at outer perimeter
          float alpha = (1.0 - smoothstep(0.85, 1.0, r)) * uProgress;
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  /**
   * Create an orbiting 3D particle vortex disk
   * @param {number} [count=250]
   * @returns {THREE.Points}
   */
  static createParticleVortex(count = 250) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const speeds = new Float32Array(count);

    const color1 = new THREE.Color(0xfef08a);
    const color2 = new THREE.Color(0xf59e0b);
    const color3 = new THREE.Color(0x8b5cf6);

    for (let i = 0; i < count; i++) {
      const radius = 0.05 + Math.random() * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      const pickColor = Math.random();
      const col = pickColor < 0.4 ? color1 : pickColor < 0.75 ? color2 : color3;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      scales[i] = 1.0 + Math.random() * 2.0;
      angles[i] = angle;
      radii[i] = radius;
      speeds[i] = speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { angles, radii, speeds, count };

    points.update = (deltaTime, progress = 1.0) => {
      const posAttr = points.geometry.attributes.position;
      const { angles, radii, speeds, count } = points.userData;
      for (let i = 0; i < count; i++) {
        angles[i] += speeds[i] * deltaTime * (1.0 + progress * 2.0);
        radii[i] -= deltaTime * 0.08 * speeds[i];
        if (radii[i] < 0.02) radii[i] = 0.45;

        posAttr.array[i * 3] = Math.cos(angles[i]) * radii[i] * progress;
        posAttr.array[i * 3 + 1] = Math.sin(angles[i]) * radii[i] * progress;
        posAttr.array[i * 3 + 2] = (1.0 - radii[i] / 0.45) * 0.08 * progress;
      }
      posAttr.needsUpdate = true;
    };

    return points;
  }
}
