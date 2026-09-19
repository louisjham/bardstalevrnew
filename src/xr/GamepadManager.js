/**
 * GamepadManager - Standard W3C HTML5 Gamepad Controller Engine
 *
 * Supports Xbox, PlayStation DualShock/DualSense, Nintendo Switch Pro,
 * and generic standard USB / Bluetooth gamepads.
 *
 * Provides:
 * - Connection lifecycle events (gamepadconnected / gamepaddisconnected)
 * - Per-frame button edge detection (justPressed, isDown, justReleased)
 * - Analog stick filtering with deadzones and sensitivity
 * - Dual-rumble and haptic vibration actuator playback
 */

export const GamepadButtons = {
  A: 0,          // Bottom button (A on Xbox, Cross on PlayStation, B on Switch)
  B: 1,          // Right button (B on Xbox, Circle on PlayStation, A on Switch)
  X: 2,          // Left button (X on Xbox, Square on PlayStation, Y on Switch)
  Y: 3,          // Top button (Y on Xbox, Triangle on PlayStation, X on Switch)
  LB: 4,         // Left Bumper / L1 / L
  RB: 5,         // Right Bumper / R1 / R
  LT: 6,         // Left Trigger / L2 / ZL
  RT: 7,         // Right Trigger / R2 / ZR
  SELECT: 8,     // Back / View / Share / Minus
  START: 9,      // Start / Menu / Options / Plus
  L3: 10,        // Left Stick Click (LS)
  R3: 11,        // Right Stick Click (RS)
  DPAD_UP: 12,   // D-Pad Up
  DPAD_DOWN: 13, // D-Pad Down
  DPAD_LEFT: 14, // D-Pad Left
  DPAD_RIGHT: 15,// D-Pad Right
  HOME: 16       // Guide / PS / Home Button
};

export const GamepadAxes = {
  LEFT_X: 0,     // Left Stick Horizontal (-1 Left, +1 Right)
  LEFT_Y: 1,     // Left Stick Vertical (-1 Up, +1 Down)
  RIGHT_X: 2,    // Right Stick Horizontal (-1 Left, +1 Right)
  RIGHT_Y: 3     // Right Stick Vertical (-1 Up, +1 Down)
};

export class GamepadManager {
  /**
   * @param {Object} options
   * @param {Function} [options.onConnect] - Callback when gamepad is connected (gamepad) => void
   * @param {Function} [options.onDisconnect] - Callback when gamepad is disconnected (gamepad) => void
   * @param {number} [options.deadzone=0.15] - Analog stick deadzone threshold (0..1)
   */
  constructor(options = {}) {
    this.onConnect = options.onConnect || null;
    this.onDisconnect = options.onDisconnect || null;
    this.deadzone = options.deadzone ?? 0.15;

    this.activeGamepadIndex = null;
    this.connected = false;
    this.gamepadName = '';

    // Button states
    this.currentButtons = new Map(); // buttonIndex -> boolean
    this.previousButtons = new Map(); // buttonIndex -> boolean
    this.buttonValues = new Map();   // buttonIndex -> number (0..1)

    // Axes values
    this.axes = [0, 0, 0, 0];

    // Trigger threshold for treating analog triggers (LT/RT) as digital buttons
    this.triggerThreshold = 0.5;

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[GamepadManager] Connected: ${e.gamepad.id} (index ${e.gamepad.index})`);
      if (this.activeGamepadIndex === null) {
        this.activeGamepadIndex = e.gamepad.index;
      }
      this.connected = true;
      this.gamepadName = this._cleanGamepadName(e.gamepad.id);

      if (this.onConnect) {
        this.onConnect(e.gamepad, this.gamepadName);
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`[GamepadManager] Disconnected: ${e.gamepad.id} (index ${e.gamepad.index})`);
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
        this.connected = false;
        this._findAlternativeGamepad();
      }

      if (this.onDisconnect) {
        this.onDisconnect(e.gamepad, this._cleanGamepadName(e.gamepad.id));
      }
    });
  }

  _cleanGamepadName(id) {
    if (!id) return 'Standard Game Controller';
    if (id.toLowerCase().includes('xbox')) return 'Xbox Controller';
    if (id.toLowerCase().includes('dualsense') || id.toLowerCase().includes('ps5')) return 'PS5 DualSense Controller';
    if (id.toLowerCase().includes('dualshock') || id.toLowerCase().includes('ps4')) return 'PS4 DualShock Controller';
    if (id.toLowerCase().includes('switch') || id.toLowerCase().includes('pro controller')) return 'Nintendo Switch Pro Controller';
    // Remove vendor/product ID codes for clean display
    return id.replace(/\s*\([^)]*\)/g, '').trim() || 'Standard Gamepad';
  }

  _findAlternativeGamepad() {
    if (typeof navigator.getGamepads !== 'function') return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        this.activeGamepadIndex = i;
        this.connected = true;
        this.gamepadName = this._cleanGamepadName(gamepads[i].id);
        if (this.onConnect) {
          this.onConnect(gamepads[i], this.gamepadName);
        }
        return;
      }
    }
  }

  /**
   * Get the active Gamepad object from the browser API.
   * @returns {Gamepad|null}
   */
  getGamepad() {
    if (typeof navigator.getGamepads !== 'function') return null;
    const gamepads = navigator.getGamepads();

    if (this.activeGamepadIndex !== null && gamepads[this.activeGamepadIndex]) {
      return gamepads[this.activeGamepadIndex];
    }

    // Fallback: check any connected gamepad
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        this.activeGamepadIndex = i;
        this.connected = true;
        this.gamepadName = this._cleanGamepadName(gamepads[i].id);
        return gamepads[i];
      }
    }

    this.connected = false;
    return null;
  }

  /**
   * Poll and update gamepad input state. Call this once per animation frame.
   */
  update() {
    const pad = this.getGamepad();
    if (!pad) {
      this.currentButtons.clear();
      this.axes = [0, 0, 0, 0];
      return;
    }

    // Save previous frame button states
    this.previousButtons = new Map(this.currentButtons);

    // Read current button states
    pad.buttons.forEach((btn, index) => {
      const isPressed = btn.pressed || btn.value > this.triggerThreshold;
      this.currentButtons.set(index, isPressed);
      this.buttonValues.set(index, btn.value);
    });

    // Read analog axes with deadzone
    if (pad.axes) {
      for (let i = 0; i < Math.min(pad.axes.length, 4); i++) {
        let val = pad.axes[i] || 0;
        if (Math.abs(val) < this.deadzone) {
          val = 0;
        } else {
          // Rescale remaining range (0..1) smoothly outside deadzone
          const sign = Math.sign(val);
          val = sign * ((Math.abs(val) - this.deadzone) / (1 - this.deadzone));
        }
        this.axes[i] = val;
      }
    }
  }

  /**
   * Is button currently held down?
   * @param {number} buttonIndex
   * @returns {boolean}
   */
  isDown(buttonIndex) {
    return !this.currentButtons.get(buttonIndex) ? false : true;
  }

  /**
   * Was button pressed this exact frame (rising edge)?
   * @param {number} buttonIndex
   * @returns {boolean}
   */
  justPressed(buttonIndex) {
    return !!this.currentButtons.get(buttonIndex) && !this.previousButtons.get(buttonIndex);
  }

  /**
   * Was button released this exact frame (falling edge)?
   * @param {number} buttonIndex
   * @returns {boolean}
   */
  justReleased(buttonIndex) {
    return !this.currentButtons.get(buttonIndex) && !!this.previousButtons.get(buttonIndex);
  }

  /**
   * Get analog axis value (-1.0 to 1.0)
   * @param {number} axisIndex
   * @returns {number}
   */
  getAxis(axisIndex) {
    return this.axes[axisIndex] || 0;
  }

  /**
   * Get button analog pressure value (0.0 to 1.0)
   * @param {number} buttonIndex
   * @returns {number}
   */
  getButtonValue(buttonIndex) {
    return this.buttonValues.get(buttonIndex) || 0;
  }

  /**
   * Trigger haptic vibration / rumble on the gamepad
   * @param {number} [weakMagnitude=0.5] - Weak motor intensity (high frequency, 0..1)
   * @param {number} [duration=120] - Duration in milliseconds
   * @param {number} [strongMagnitude=null] - Strong motor intensity (low frequency, 0..1). Defaults to weakMagnitude.
   */
  vibrate(weakMagnitude = 0.5, duration = 120, strongMagnitude = null) {
    const pad = this.getGamepad();
    if (!pad) return;

    const strong = strongMagnitude !== null ? strongMagnitude : weakMagnitude;

    // 1. Dual-rumble actuator (Standard Gamepad API)
    if (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === 'function') {
      pad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration,
        weakMagnitude: Math.min(Math.max(weakMagnitude, 0), 1),
        strongMagnitude: Math.min(Math.max(strong, 0), 1)
      }).catch(() => {
        // Silently ignore if vibration effect is unsupported or busy
      });
      return;
    }

    // 2. Haptic actuators fallback (WebXR / older API)
    if (pad.hapticActuators && pad.hapticActuators.length > 0) {
      try {
        pad.hapticActuators[0].pulse(Math.max(weakMagnitude, strong), duration);
      } catch (e) {
        // Silently ignore
      }
    }
  }
}
