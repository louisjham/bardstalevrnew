import * as THREE from 'three';

/**
 * CRTMonitorShader - Authentic Commodore 1702 / 1084S CRT Tube Shader
 *
 * Visual Features:
 *   - Barrel distortion (convex curved glass tube curvature)
 *   - Phosphor RGB triad sub-pixel mask & scanline rasterization
 *   - Cathode ray sweep jitter & subtle 60Hz phosphor decay flicker
 *   - Corner vignette & glass reflection highlight
 */
export class CRTMonitorShader {
  /**
   * @param {THREE.Texture} canvasTexture
   * @returns {THREE.ShaderMaterial}
   */
  static createMaterial(canvasTexture) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: canvasTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.12 },
        uScanlineIntensity: { value: 0.22 },
        uPhosphorBloom: { value: 0.28 },
        uVignette: { value: 0.35 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uCurvature;
        uniform float uScanlineIntensity;
        uniform float uPhosphorBloom;
        uniform float uVignette;
        varying vec2 vUv;

        // Barrel distortion for curved CRT glass
        vec2 curveUV(vec2 uv) {
          vec2 centered = uv * 2.0 - 1.0;
          vec2 offset = centered.yx / vec2(6.0, 4.0);
          centered = centered + centered * offset * offset * (uCurvature * 2.5);
          return centered * 0.5 + 0.5;
        }

        void main() {
          vec2 curved = curveUV(vUv);

          // Discard pixels outside CRT glass tube boundary
          if (curved.x < 0.0 || curved.x > 1.0 || curved.y < 0.0 || curved.y > 1.0) {
            gl_FragColor = vec4(0.02, 0.02, 0.03, 1.0);
            return;
          }

          // Sample base texture with slight chromatic aberration on tube edges
          float dist = distance(curved, vec2(0.5));
          vec2 redUV = curved + vec2(dist * 0.003, 0.0);
          vec2 blueUV = curved - vec2(dist * 0.003, 0.0);

          float r = texture2D(tDiffuse, redUV).r;
          float g = texture2D(tDiffuse, curved).g;
          float b = texture2D(tDiffuse, blueUV).b;
          vec3 baseColor = vec3(r, g, b);

          // Horizontal scanlines
          float scanline = sin((curved.y * 480.0 + uTime * 6.0) * 3.14159);
          scanline = (scanline + 1.0) * 0.5;
          baseColor *= (1.0 - uScanlineIntensity * (1.0 - scanline));

          // RGB Phosphor sub-pixel mask
          float phosphor = sin(curved.x * 640.0 * 3.14159 * 2.0);
          baseColor += baseColor * (phosphor * 0.08);

          // Phosphor bloom glow
          baseColor += baseColor * uPhosphorBloom;

          // Corner & edge vignette
          vec2 vignetteUV = curved * (1.0 - curved.yx);
          float vignette = vignetteUV.x * vignetteUV.y * 35.0;
          vignette = clamp(pow(vignette, uVignette), 0.0, 1.0);
          baseColor *= vignette;

          // Glass specular sheen
          float sheen = pow(1.0 - distance(curved, vec2(0.35, 0.65)), 4.0) * 0.08;
          baseColor += vec3(sheen);

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }
}
