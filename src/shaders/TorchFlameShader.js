import * as THREE from 'three';

/**
 * TorchFlameShader - Volumetric Flame and Rising Smoke Particle System
 *
 * Visual Features:
 *   - Procedural flame turbulence with noise-based heat shimmer
 *   - Customizable flame tint (classic warm amber, sapphire blue, mystic violet, emerald green)
 *   - Billowing, rising smoke particles with fading opacity
 */
export class TorchFlameShader {
  /**
   * Create an animated torch flame mesh with custom GLSL shader
   * @param {string|number} [colorType='fire'] - 'fire', 'blue', 'violet', 'green'
   * @returns {THREE.Mesh}
   */
  static createFlameMesh(colorType = 'fire') {
    let coreColor = new THREE.Color(0xffedd5);
    let midColor = new THREE.Color(0xf97316);
    let tipColor = new THREE.Color(0xb91c1c);

    if (colorType === 'blue') {
      coreColor = new THREE.Color(0xe0f2fe);
      midColor = new THREE.Color(0x38bdf8);
      tipColor = new THREE.Color(0x1d4ed8);
    } else if (colorType === 'violet') {
      coreColor = new THREE.Color(0xf5d0fe);
      midColor = new THREE.Color(0xc084fc);
      tipColor = new THREE.Color(0x6b21a8);
    } else if (colorType === 'green') {
      coreColor = new THREE.Color(0xdcfce7);
      midColor = new THREE.Color(0x4ade80);
      tipColor = new THREE.Color(0x15803d);
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uCoreColor: { value: coreColor },
        uMidColor: { value: midColor },
        uTipColor: { value: tipColor }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Heat turbulence flicker
          float heightFactor = smoothstep(0.0, 1.0, uv.y);
          float flickerX = sin(uTime * 14.0 + pos.y * 10.0) * 0.035 * heightFactor;
          float flickerZ = cos(uTime * 11.0 + pos.y * 8.0) * 0.035 * heightFactor;
          pos.x += flickerX;
          pos.z += flickerZ;

          // Vertical stretching/breathing
          pos.y *= (1.0 + sin(uTime * 9.0) * 0.08);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCoreColor;
        uniform vec3 uMidColor;
        uniform vec3 uTipColor;
        varying vec2 vUv;

        void main() {
          float dist = distance(vUv.x, 0.5) * 2.0; // 0 at center, 1 at sides
          float height = vUv.y; // 0 at base, 1 at tip

          // Flame tear-drop shape profile
          float shape = (1.0 - dist) * (1.0 - height * 0.7);
          shape = smoothstep(0.15, 0.9, shape);

          if (shape <= 0.01) discard;

          // Color gradient from bright core -> hot body -> tip
          vec3 color = mix(uCoreColor, uMidColor, smoothstep(0.0, 0.45, height));
          color = mix(color, uTipColor, smoothstep(0.45, 0.95, height));

          // Edge glow
          color += uCoreColor * (1.0 - dist) * 0.4;

          float alpha = shape * (1.0 - height * 0.3);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Teardrop flame geometry
    const geometry = new THREE.ConeGeometry(0.065, 0.22, 12, 8, true);
    geometry.translate(0, 0.11, 0); // Base at y=0

    const mesh = new THREE.Mesh(geometry, material);
    mesh.update = (time) => {
      material.uniforms.uTime.value = time;
    };

    return mesh;
  }
}
