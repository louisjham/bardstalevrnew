import * as THREE from 'three';
import { GamepadButtons, GamepadAxes } from './GamepadManager.js';

/**
 * FreeLocomotion - WASD Keyboard + WebXR Thumbstick + Standard Gamepad +
 * WebXR Hand Tracking "Rolling Office Chair" Locomotion with Directional Steering & 2D Bumper Car Bouncing.
 *
 * Locomotion Features:
 *   - Strict Horizontal Plane Lock: Avatar position Y is strictly pinned to ground (Y=0 in VR).
 *   - Raised Arm + Fist Gesture: Propels the player forward at a fast walking speed (max 2.4 m/s),
 *     smoothly accelerating like being pushed in a rolling office chair.
 *   - Lateral Arm Steering:
 *       * Arm moved left: Avatar spins counter-clockwise, retaining momentum.
 *       * Arm moved right: Avatar spins clockwise, retaining momentum.
 *   - Rolling Chair Momentum: When fist is released, momentum coasts with caster drag friction
 *     smoothly to a stop.
 *   - 2D Bumper Car Physics: When colliding with 2D hitboxes (walls, furniture, counters),
 *     the player bounces off the obstacle 2D surface normal with springy restitution and VR haptics.
 */
export class FreeLocomotion {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   * @param {import('./XRRig.js').XRRig} [xrRig=null]
   * @param {import('./GamepadManager.js').GamepadManager} [gamepadManager=null]
   * @param {import('./XRManager.js').XRManager} [xrManager=null]
   */
  constructor(camera, scene, xrRig = null, gamepadManager = null, xrManager = null) {
    this.camera = camera;
    this.scene = scene;
    this.xrRig = xrRig;
    this.gamepadManager = gamepadManager;
    this.xrManager = xrManager;
    this.skaraBraeGrid = null;
    this.currentGameState = null;

    // Movement Speeds & Rotation
    this.moveSpeed = 3.0; // 3.0 m/s for direct thumbstick / keyboard
    this.rotateSpeed = 1.8;
    this.pitchSpeed = 1.6;
    this.pitchAngle = 0;

    // Keyboard state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      rotLeft: false,
      rotRight: false,
      fistPush: false
    };

    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();

    // Rolling Office Chair Kinematics (Gradual Push + Coasting Friction)
    this.chairVelocity = new THREE.Vector3();
    this.chairMaxSpeed = 2.4;      // Fast walking max speed (m/s)
    this.chairAcceleration = 1.6;  // Gradual push acceleration (m/s^2)
    this.chairFriction = 1.3;      // Caster rolling friction / drag (m/s^2)
    this.isFistPushing = false;
    this.currentSpinRate = 0.0;    // Radians per second
    this.bumperRadius = 0.52;      // Sensitive 2D Player bumper car collision radius (m)
    this.groundElevation = 1.18;   // Avatar eye height locked at eye-level with Bard and seated patrons (1.18m)

    // Bumper Car Bounce Callback
    this.onBounce = null;

    // Pre-allocated reusable vectors
    this._forward = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._deltaPos = new THREE.Vector3();
    this._targetChairVel = new THREE.Vector3();
    this._headPos = new THREE.Vector3();
    this._headQuat = new THREE.Quaternion();
    this._invHeadQuat = new THREE.Quaternion();
    this._handPos = new THREE.Vector3();
    this._localHandPos = new THREE.Vector3();
    this._bounceNormal = new THREE.Vector3();
    this._yAxis = new THREE.Vector3(0, 1, 0);

    this.bindKeyboard();
  }

  setXRManager(xrManager) {
    this.xrManager = xrManager;
  }

  setGamepadManager(gamepadManager) {
    this.gamepadManager = gamepadManager;
  }

  setGridReference(grid) {
    this.skaraBraeGrid = grid;
  }

  setGameState(state) {
    this.currentGameState = state;
  }

  bindKeyboard() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'KeyQ': case 'ArrowLeft': this.keys.rotLeft = true; break;
        case 'KeyE': case 'ArrowRight': this.keys.rotRight = true; break;
        case 'KeyF': case 'Space': this.keys.fistPush = true; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'KeyQ': case 'ArrowLeft': this.keys.rotLeft = false; break;
        case 'KeyE': case 'ArrowRight': this.keys.rotRight = false; break;
        case 'KeyF': case 'Space': this.keys.fistPush = false; break;
      }
    });
  }

  /**
   * Get the movement target - either the XRRig or the camera (desktop fallback).
   * @returns {THREE.Object3D}
   * @private
   */
  _getMovementTarget() {
    return this.xrRig ? this.xrRig.rig : this.camera;
  }

  /**
   * Evaluates if player has raised their arm, closed into a fist, and measures lateral steering.
   * Returns: { isFist: boolean, spinRate: number }
   * spinRate > 0: Counter-Clockwise (Turn Left)
   * spinRate < 0: Clockwise (Turn Right)
   * spinRate = 0: Straight Ahead
   *
   * @param {XRSession} xrSession
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} refSpace
   * @returns {{ isFist: boolean, spinRate: number }}
   */
  _checkRaisedFistAndSteering(xrSession, frame, refSpace) {
    let isFist = false;
    let spinRate = 0.0;

    // 1. Direct WebXR Frame Joint Pose & Viewer Pose (Primary VR Hand Tracking)
    if (xrSession && frame && refSpace) {
      const viewerPose = frame.getViewerPose(refSpace);
      if (viewerPose) {
        const headX = viewerPose.transform.position.x;
        const headY = viewerPose.transform.position.y;
        const headZ = viewerPose.transform.position.z;

        const hq = viewerPose.transform.orientation;
        this._headQuat.set(hq.x, hq.y, hq.z, hq.w);
        this._invHeadQuat.copy(this._headQuat).invert();

        if (xrSession.inputSources) {
          for (const inputSource of xrSession.inputSources) {
            // A. Pure Hand Tracking (XRHand)
            if (inputSource.hand) {
              const wrist = inputSource.hand.get('wrist');
              const indexTip = inputSource.hand.get('index-finger-tip');
              const middleTip = inputSource.hand.get('middle-finger-tip');
              const ringTip = inputSource.hand.get('ring-finger-tip');
              const pinkyTip = inputSource.hand.get('pinky-finger-tip');

              if (wrist && indexTip) {
                const wristPose = frame.getJointPose(wrist, refSpace);
                const indexPose = frame.getJointPose(indexTip, refSpace);
                const middlePose = middleTip ? frame.getJointPose(middleTip, refSpace) : null;
                const ringPose = ringTip ? frame.getJointPose(ringTip, refSpace) : null;
                const pinkyPose = pinkyTip ? frame.getJointPose(pinkyTip, refSpace) : null;

                if (wristPose && indexPose) {
                  const wx = wristPose.transform.position.x;
                  const wy = wristPose.transform.position.y;
                  const wz = wristPose.transform.position.z;

                  const dx = wx - headX;
                  const dy = wy - headY;
                  const dz = wz - headZ;
                  const distToHead = Math.sqrt(dx * dx + dy * dy + dz * dz);
                  const isArmRaised = distToHead >= 0.12 && distToHead <= 0.90 && (dy > -0.65);

                  if (isArmRaised) {
                    const dIndex = this._jointDist(indexPose.transform.position, wristPose.transform.position);
                    const dMiddle = middlePose ? this._jointDist(middlePose.transform.position, wristPose.transform.position) : dIndex;
                    const dRing = ringPose ? this._jointDist(ringPose.transform.position, wristPose.transform.position) : dIndex;
                    const dPinky = pinkyPose ? this._jointDist(pinkyPose.transform.position, wristPose.transform.position) : dIndex;

                    const avgDist = (dIndex + dMiddle + dRing + dPinky) / 4.0;
                    if (avgDist < 0.125 || (dIndex < 0.12 && dMiddle < 0.12)) {
                      isFist = true;

                      // Transform wrist position relative to head in head-local coordinates
                      this._localHandPos.set(dx, dy, dz).applyQuaternion(this._invHeadQuat);
                      const isLeftHand = inputSource.handedness === 'left';

                      if (!isLeftHand) {
                        // Right Hand (primary steering arm)
                        // Neutral straight ahead is approx +0.14m.
                        // Moving to the left across chest (x < 0.05m): Spin Counter-Clockwise (Turn Left)
                        // Moving to the right outward (x > 0.23m): Spin Clockwise (Turn Right)
                        if (this._localHandPos.x < 0.05) {
                          const defl = Math.min(1.0, (0.05 - this._localHandPos.x) / 0.18);
                          spinRate = +2.2 * defl;
                        } else if (this._localHandPos.x > 0.23) {
                          const defl = Math.min(1.0, (this._localHandPos.x - 0.23) / 0.18);
                          spinRate = -2.2 * defl;
                        }
                      } else {
                        // Left Hand (if player raises left arm)
                        // Neutral straight ahead is approx -0.14m.
                        // Moving to the left outward (x < -0.23m): Spin Counter-Clockwise (Turn Left)
                        // Moving to the right across chest (x > -0.05m): Spin Clockwise (Turn Right)
                        if (this._localHandPos.x < -0.23) {
                          const defl = Math.min(1.0, (-0.23 - this._localHandPos.x) / 0.18);
                          spinRate = +2.2 * defl;
                        } else if (this._localHandPos.x > -0.05) {
                          const defl = Math.min(1.0, (this._localHandPos.x - -0.05) / 0.18);
                          spinRate = -2.2 * defl;
                        }
                      }
                      break;
                    }
                  }
                }
              }
            }

            // B. 6DOF VR Controller Grip / Trigger Squeeze with Steering fallback
            if (!isFist && inputSource.gamepad && inputSource.gamepad.buttons) {
              const gripBtn = inputSource.gamepad.buttons[1];
              const triggerBtn = inputSource.gamepad.buttons[0];
              const isSqueezing = (gripBtn && (gripBtn.pressed || gripBtn.value > 0.4)) ||
                                  (triggerBtn && (triggerBtn.pressed || triggerBtn.value > 0.4));

              if (isSqueezing) {
                const gripPose = frame.getPose(inputSource.gripSpace || inputSource.targetRaySpace, refSpace);
                if (gripPose) {
                  const gx = gripPose.transform.position.x;
                  const gy = gripPose.transform.position.y;
                  const gz = gripPose.transform.position.z;

                  const cdx = gx - headX;
                  const cdy = gy - headY;
                  const cdz = gz - headZ;
                  const distToHead = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
                  const isArmRaised = distToHead >= 0.12 && distToHead <= 0.90 && (cdy > -0.65);

                  if (isArmRaised) {
                    isFist = true;
                    this._localHandPos.set(cdx, cdy, cdz).applyQuaternion(this._invHeadQuat);
                    const isLeftHand = inputSource.handedness === 'left';

                    if (!isLeftHand) {
                      if (this._localHandPos.x < 0.05) {
                        const defl = Math.min(1.0, (0.05 - this._localHandPos.x) / 0.18);
                        spinRate = +2.2 * defl;
                      } else if (this._localHandPos.x > 0.23) {
                        const defl = Math.min(1.0, (this._localHandPos.x - 0.23) / 0.18);
                        spinRate = -2.2 * defl;
                      }
                    } else {
                      if (this._localHandPos.x < -0.23) {
                        const defl = Math.min(1.0, (-0.23 - this._localHandPos.x) / 0.18);
                        spinRate = +2.2 * defl;
                      } else if (this._localHandPos.x > -0.05) {
                        const defl = Math.min(1.0, (this._localHandPos.x - -0.05) / 0.18);
                        spinRate = -2.2 * defl;
                      }
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Three.js Scene Graph Fallback (e.g. Unit tests or custom rig setups)
    if (!isFist) {
      this.camera.getWorldPosition(this._headPos);
      this.camera.getWorldQuaternion(this._headQuat);
      this._invHeadQuat.copy(this._headQuat).invert();

      if (this.xrManager && this.xrManager.hands && this.xrManager.hands.length > 0) {
        for (let handIdx = 0; handIdx < this.xrManager.hands.length; handIdx++) {
          const hand = this.xrManager.hands[handIdx];
          if (!hand) continue;

          // Prefer wrist joint position if available, else hand position
          if (hand.joints && hand.joints['wrist'] && typeof hand.joints['wrist'].getWorldPosition === 'function') {
            hand.joints['wrist'].getWorldPosition(this._handPos);
          } else {
            hand.getWorldPosition(this._handPos);
          }

          const distToHead = this._handPos.distanceTo(this._headPos);
          const isArmRaised = distToHead > 0.12 && distToHead < 0.90 && (this._handPos.y > this._headPos.y - 0.65);

          if (isArmRaised) {
            let isFistCurled = true;
            if (hand.joints) {
              const indexTip = hand.joints['index-finger-tip'];
              const wrist = hand.joints['wrist'];
              if (indexTip && wrist) {
                const dIndex = indexTip.position ? indexTip.position.length() : 0.05;
                const middleTip = hand.joints['middle-finger-tip'];
                const ringTip = hand.joints['ring-finger-tip'];
                const pinkyTip = hand.joints['pinky-finger-tip'];

                const dMiddle = middleTip && middleTip.position ? middleTip.position.length() : dIndex;
                const dRing = ringTip && ringTip.position ? ringTip.position.length() : dIndex;
                const dPinky = pinkyTip && pinkyTip.position ? pinkyTip.position.length() : dIndex;

                const avgDist = (dIndex + dMiddle + dRing + dPinky) / 4.0;
                isFistCurled = avgDist < 0.125 || (dIndex < 0.12 && dMiddle < 0.12);
              }
            }

            if (isFistCurled) {
              isFist = true;
              this._localHandPos.copy(this._handPos).sub(this._headPos).applyQuaternion(this._invHeadQuat);
              const isExplicitLeftHand = hand.userData && hand.userData.index === 0 && this.xrManager.hands.length > 1;

              if (!isExplicitLeftHand) {
                if (this._localHandPos.x < 0.05) {
                  const defl = Math.min(1.0, (0.05 - this._localHandPos.x) / 0.18);
                  spinRate = +2.2 * defl;
                } else if (this._localHandPos.x > 0.23) {
                  const defl = Math.min(1.0, (this._localHandPos.x - 0.23) / 0.18);
                  spinRate = -2.2 * defl;
                }
              } else {
                if (this._localHandPos.x < -0.23) {
                  const defl = Math.min(1.0, (-0.23 - this._localHandPos.x) / 0.18);
                  spinRate = +2.2 * defl;
                } else if (this._localHandPos.x > -0.05) {
                  const defl = Math.min(1.0, (this._localHandPos.x - -0.05) / 0.18);
                  spinRate = -2.2 * defl;
                }
              }
              break;
            }
          }
        }
      }
    }

    // 3. Desktop Keyboard / Fallback testing key (F or Space)
    if (this.keys.fistPush) {
      isFist = true;
      if (this.keys.left || this.keys.rotLeft) spinRate += 2.0;
      if (this.keys.right || this.keys.rotRight) spinRate -= 2.0;
    }

    return { isFist, spinRate };
  }

  _jointDist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get list of 2D spatial collision obstacles (room walls, furniture, counters)
   * on the horizontal (X, Z) plane based on the active location.
   */
  getObstacles(gameState) {
    const state = gameState || this.currentGameState;
    const obstacles = [];

    if (state === 'TAVERN_INTRO') {
      // 2D Tavern Perimeter Walls
      obstacles.push({ type: 'roomBounds', minX: -4.8, maxX: 4.8, minZ: -5.8, maxZ: 5.8 });
      // 2D Fireplace
      obstacles.push({ type: 'box', minX: -1.4, maxX: 1.4, minZ: -5.8, maxZ: -4.6 });
      // 2D Bar Counter
      obstacles.push({ type: 'box', minX: 1.8, maxX: 4.8, minZ: -4.4, maxZ: -0.6 });
      // 2D Performer Stage & Bard
      obstacles.push({ type: 'box', minX: -4.8, maxX: -1.5, minZ: -5.8, maxZ: -2.6 });
      // 2D Patron Tables (Matching FullVRTavern layout)
      obstacles.push({ type: 'circle', x: 2.8, z: -1.8, radius: 0.85 });
      obstacles.push({ type: 'circle', x: -2.8, z: -1.8, radius: 0.85 });
      obstacles.push({ type: 'circle', x: 3.2, z: 1.8, radius: 0.85 });
      obstacles.push({ type: 'circle', x: -3.2, z: 1.8, radius: 0.85 });
    } else if (state === 'GARTHS_SHOP') {
      // 2D Garth Shop Walls
      obstacles.push({ type: 'roomBounds', minX: -3.4, maxX: 3.4, minZ: -3.6, maxZ: 3.6 });
      // 2D Weapon Counter & Garth
      obstacles.push({ type: 'box', minX: -2.6, maxX: 2.6, minZ: -1.8, maxZ: -0.4 });
      // 2D Display Shelves
      obstacles.push({ type: 'box', minX: -3.4, maxX: -2.6, minZ: 0.2, maxZ: 2.6 });
      obstacles.push({ type: 'box', minX: 2.6, maxX: 3.4, minZ: 0.2, maxZ: 2.6 });
    } else if (state === 'RETRO_ROOM') {
      // 2D Bedroom Walls
      obstacles.push({ type: 'roomBounds', minX: -2.6, maxX: 2.6, minZ: -2.1, maxZ: 3.1 });
      // 2D Computer Desk
      obstacles.push({ type: 'box', minX: -0.9, maxX: 0.9, minZ: -1.2, maxZ: -0.1 });
      // 2D Bed
      obstacles.push({ type: 'box', minX: 1.0, maxX: 2.6, minZ: 0.4, maxZ: 3.0 });
      // 2D Dresser
      obstacles.push({ type: 'box', minX: -2.6, maxX: -1.0, minZ: 1.4, maxZ: 3.0 });
    } else if (state === 'SKARA_BRAE_STREETS') {
      // 2D City Limits
      obstacles.push({ type: 'roomBounds', minX: -5.0, maxX: 55.0, minZ: -25.0, maxZ: 35.0 });
    }

    return obstacles;
  }

  /**
   * 2D Bumper Car Collision Detection and Bounce Response:
   * Operates strictly on the 2D (X, Z) ground plane. Pushes the player 2D position outside
   * obstacles and reflects 2D velocity across the contact normal.
   *
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} velocity
   * @param {string} gameState
   */
  applyBumperCarCollisions(position, velocity, gameState) {
    const obstacles = this.getObstacles(gameState);
    let didBounce = false;
    this._bounceNormal.set(0, 0, 0);

    for (const obs of obstacles) {
      let obsHit = false;
      let nx = 0, nz = 0;

      if (obs.type === 'roomBounds') {
        // 2D Outer room boundaries (keep player 2D disk INSIDE)
        if (position.x < obs.minX + this.bumperRadius) {
          position.x = obs.minX + this.bumperRadius;
          nx = 1.0;
          obsHit = true;
        } else if (position.x > obs.maxX - this.bumperRadius) {
          position.x = obs.maxX - this.bumperRadius;
          nx = -1.0;
          obsHit = true;
        }

        if (position.z < obs.minZ + this.bumperRadius) {
          position.z = obs.minZ + this.bumperRadius;
          nz = 1.0;
          obsHit = true;
        } else if (position.z > obs.maxZ - this.bumperRadius) {
          position.z = obs.maxZ - this.bumperRadius;
          nz = -1.0;
          obsHit = true;
        }
      } else if (obs.type === 'box') {
        // 2D Obstacle Box (keep player 2D disk OUTSIDE)
        const closestX = THREE.MathUtils.clamp(position.x, obs.minX, obs.maxX);
        const closestZ = THREE.MathUtils.clamp(position.z, obs.minZ, obs.maxZ);

        const dx = position.x - closestX;
        const dz = position.z - closestZ;
        const distSq = dx * dx + dz * dz;

        const isInside = (position.x >= obs.minX && position.x <= obs.maxX && position.z >= obs.minZ && position.z <= obs.maxZ);

        if (distSq < this.bumperRadius * this.bumperRadius || isInside) {
          let dist = Math.sqrt(distSq);

          if (dist < 0.0001 || isInside) {
            const toMinX = position.x - obs.minX;
            const toMaxX = obs.maxX - position.x;
            const toMinZ = position.z - obs.minZ;
            const toMaxZ = obs.maxZ - position.z;
            const minOverlap = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);

            if (minOverlap === toMinX) { nx = -1; nz = 0; }
            else if (minOverlap === toMaxX) { nx = 1; nz = 0; }
            else if (minOverlap === toMinZ) { nx = 0; nz = -1; }
            else { nx = 0; nz = 1; }
          } else {
            nx = dx / dist;
            nz = dz / dist;
          }

          position.x = closestX + nx * (this.bumperRadius + 0.02);
          position.z = closestZ + nz * (this.bumperRadius + 0.02);
          obsHit = true;
        }
      } else if (obs.type === 'circle') {
        // 2D Circular Table / Column Obstacle
        const dx = position.x - obs.x;
        const dz = position.z - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obs.radius + this.bumperRadius;

        if (dist < minDist) {
          nx = dist > 0.001 ? dx / dist : 1.0;
          nz = dist > 0.001 ? dz / dist : 0.0;

          position.x = obs.x + nx * (minDist + 0.02);
          position.z = obs.z + nz * (minDist + 0.02);
          obsHit = true;
        }
      }

      if (obsHit) {
        didBounce = true;
        this._bounceNormal.set(nx, 0, nz);
      }
    }

    // Check 2D Skara Brae City Grid Wall Collision in street mode
    if (gameState === 'SKARA_BRAE_STREETS' && this.skaraBraeGrid && typeof this.skaraBraeGrid.isWalkable === 'function') {
      const isWalkable = this.skaraBraeGrid.isWalkable(position.x, position.z);
      if (!isWalkable) {
        const cellCenter = this.skaraBraeGrid.worldToGrid ? this.skaraBraeGrid.worldToGrid(position.x, position.z) : null;
        if (cellCenter) {
          const worldPos = this.skaraBraeGrid.gridToWorld(cellCenter.gx, cellCenter.gz);
          const dx = position.x - worldPos.x;
          const dz = position.z - worldPos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const nx = dist > 0.001 ? dx / dist : 1.0;
          const nz = dist > 0.001 ? dz / dist : 0.0;

          position.x += nx * 0.45;
          position.z += nz * 0.45;

          this._bounceNormal.set(nx, 0, nz);
          didBounce = true;
        }
      }
    }

    // 2D BUMPER CAR BOUNCE VELOCITY REFLECTION & LIGHT PUSHBACK
    if (didBounce && this._bounceNormal.lengthSq() > 0.001) {
      this._bounceNormal.y = 0;
      this._bounceNormal.normalize();

      // Light separation push displacement to prevent sticking
      position.addScaledVector(this._bounceNormal, 0.035);

      const vDotN = velocity.dot(this._bounceNormal);
      if (vDotN < 0) { // Only reflect if moving toward the obstacle
        const restitution = 0.45; // Gentle, light pushback elasticity
        velocity.addScaledVector(this._bounceNormal, -(1 + restitution) * vDotN);

        // Gentle minimum pushback
        if (velocity.length() < 0.4) {
          velocity.addScaledVector(this._bounceNormal, 0.45);
        }
      }

      // Trigger VR Haptics on both controllers
      if (this.xrManager && typeof this.xrManager.triggerHaptics === 'function') {
        this.xrManager.triggerHaptics(0, 0.65, 75);
        this.xrManager.triggerHaptics(1, 0.65, 75);
      }

      if (this.onBounce) {
        this.onBounce(this._bounceNormal);
      }
    }
  }

  // Update Free Locomotion per frame
  update(deltaTime, xrSession = null, frame = null, refSpace = null, gameState = null) {
    if (!deltaTime) return;
    const activeState = gameState || this.currentGameState;

    this.moveDirection.set(0, 0, 0);

    // 1. Keyboard Controls
    if (this.keys.forward) this.moveDirection.z -= 1;
    if (this.keys.backward) this.moveDirection.z += 1;
    if (this.keys.left) this.moveDirection.x -= 1;
    if (this.keys.right) this.moveDirection.x += 1;

    const target = this._getMovementTarget();

    // Smooth Keyboard Rotation (Q / E or Arrow Keys)
    if (this.keys.rotLeft) target.rotation.y += this.rotateSpeed * deltaTime;
    if (this.keys.rotRight) target.rotation.y -= this.rotateSpeed * deltaTime;

    let speedMultiplier = 1.0;

    // 2. Standard Gamepad Controls (Xbox, PS4/PS5, Switch, Generic USB/BT)
    if (this.gamepadManager && this.gamepadManager.connected) {
      const gp = this.gamepadManager;

      // Left Stick Movement
      const lx = gp.getAxis(GamepadAxes.LEFT_X);
      const ly = gp.getAxis(GamepadAxes.LEFT_Y);
      if (Math.abs(lx) > 0) this.moveDirection.x += lx;
      if (Math.abs(ly) > 0) this.moveDirection.z += ly;

      // D-Pad Movement
      if (gp.isDown(GamepadButtons.DPAD_UP)) this.moveDirection.z -= 1;
      if (gp.isDown(GamepadButtons.DPAD_DOWN)) this.moveDirection.z += 1;
      if (gp.isDown(GamepadButtons.DPAD_LEFT)) this.moveDirection.x -= 1;
      if (gp.isDown(GamepadButtons.DPAD_RIGHT)) this.moveDirection.x += 1;

      // L3 Sprint
      if (gp.isDown(GamepadButtons.L3)) {
        speedMultiplier = 1.5;
      }

      // Right Stick: Yaw & Pitch Look
      const rx = gp.getAxis(GamepadAxes.RIGHT_X);
      const ry = gp.getAxis(GamepadAxes.RIGHT_Y);

      if (Math.abs(rx) > 0) {
        target.rotation.y -= rx * this.rotateSpeed * deltaTime;
      }

      if (Math.abs(ry) > 0 && !xrSession) {
        this.pitchAngle -= ry * this.pitchSpeed * deltaTime;
        this.pitchAngle = Math.max(-1.25, Math.min(1.25, this.pitchAngle));
        this.camera.rotation.x = this.pitchAngle;
      }

      // R3 Click: Recenter / Level Camera
      if (gp.justPressed(GamepadButtons.R3)) {
        this.pitchAngle = 0;
        this.camera.rotation.x = 0;
      }
    }

    // 3. WebXR VR Controller Thumbstick Input
    if (xrSession) {
      for (const inputSource of xrSession.inputSources) {
        if (!inputSource.gamepad || !inputSource.gamepad.axes) continue;

        const axes = inputSource.gamepad.axes;

        if (inputSource.handedness === 'left') {
          // Left Thumbstick: Movement
          const thumbX = axes.length > 2 ? axes[2] : axes[0] ?? 0;
          const thumbY = axes.length > 3 ? axes[3] : axes[1] ?? 0;
          if (Math.abs(thumbX) > 0.15) this.moveDirection.x += thumbX;
          if (Math.abs(thumbY) > 0.15) this.moveDirection.z += thumbY;
        } else if (inputSource.handedness === 'right') {
          // Right Thumbstick: Smooth Rotation on the rig
          const thumbX = axes.length > 2 ? axes[2] : axes[0] ?? 0;
          if (Math.abs(thumbX) > 0.2) {
            target.rotation.y -= thumbX * this.rotateSpeed * deltaTime;
          }
        }
      }
    }

    // 4. WebXR Hand Tracking Raised Arm + Fist Gesture with Lateral Steering
    const gesture = this._checkRaisedFistAndSteering(xrSession, frame, refSpace);
    this.isFistPushing = gesture.isFist;
    this.currentSpinRate = gesture.spinRate;

    // Apply Spin / Steering while RETAINING MOMENTUM
    if (Math.abs(this.currentSpinRate) > 0.01) {
      const deltaYaw = this.currentSpinRate * deltaTime;
      target.rotation.y += deltaYaw;
      if (typeof target.updateMatrixWorld === 'function') {
        target.updateMatrixWorld(true);
      }

      // Seamlessly rotate current chair velocity vector around Y axis to preserve momentum
      if (this.chairVelocity.lengthSq() > 0.0001) {
        this.chairVelocity.applyAxisAngle(this._yAxis, deltaYaw);
      }
    }

    // Compute Forward Direction from true horizontal world gaze orientation (planar, Y=0)
    this.camera.getWorldQuaternion(this._headQuat);
    this._forward.set(0, 0, -1).applyQuaternion(this._headQuat);
    this._forward.y = 0;
    this._forward.normalize();

    this._side.set(1, 0, 0).applyQuaternion(this._headQuat);
    this._side.y = 0;
    this._side.normalize();

    // Rolling Chair Momentum Engine (Gradual Acceleration & Caster Drag Friction)
    if (this.isFistPushing) {
      // Pushing in rolling chair: accelerate forward smoothly along horizontal gaze direction up to fast walking speed
      this._targetChairVel.copy(this._forward).multiplyScalar(this.chairMaxSpeed);
      const lerpFactor = THREE.MathUtils.clamp(this.chairAcceleration * deltaTime, 0, 1);
      this.chairVelocity.lerp(this._targetChairVel, lerpFactor);
    } else {
      // Coasting / decelerating with caster rolling friction
      const currentSpeed = this.chairVelocity.length();
      if (currentSpeed > 0.001) {
        const newSpeed = Math.max(0, currentSpeed - this.chairFriction * deltaTime);
        this.chairVelocity.multiplyScalar(newSpeed / currentSpeed);
      } else {
        this.chairVelocity.set(0, 0, 0);
      }
    }

    // Apply Rolling Chair Displacement
    if (this.chairVelocity.lengthSq() > 0.0001) {
      target.position.addScaledVector(this.chairVelocity, deltaTime);
    }

    // Standard Discrete Direct Movement (Keyboard / Thumbsticks / Gamepad)
    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
      const effectiveSpeed = this.moveSpeed * speedMultiplier;

      this._deltaPos.set(0, 0, 0)
        .addScaledVector(this._forward, -this.moveDirection.z * effectiveSpeed * deltaTime)
        .addScaledVector(this._side, this.moveDirection.x * effectiveSpeed * deltaTime);

      target.position.add(this._deltaPos);
    }

    // 5. 2D Bumper Car Collision Detection & Bounce Response
    this.applyBumperCarCollisions(target.position, this.chairVelocity, activeState);

    // 6. Strict Planar Ground Lock:
    // In WebXR VR mode, rig is pinned to floor (y = 0.0) so real physical room-scale/seated height is natural.
    // In desktop fallback mode, eye height is pinned to eye level (y = 1.18m) matching Bard and seated patrons.
    if (this.xrManager && this.xrManager.isVRActive) {
      target.position.y = 0.0;
    } else if (this.xrRig) {
      target.position.y = this.groundElevation;
    } else {
      this.camera.position.y = this.groundElevation;
    }
  }
}
