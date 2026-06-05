import { CarController } from './carController';
import type { DriveInput } from './carController';

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyR']);

export class CarInput {
  constructor(
    private controller: CarController,
    private onReset: () => void,
    private onFirstInput?: () => void
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearKeys);
  }

  private keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  };

  private touchKeys = {
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyR') {
      e.preventDefault();
      if (e.repeat) return;
      this.clearKeys();
      this.onReset();
      return;
    }

    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    this.onFirstInput?.();
    this.set(e, true);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    this.set(e, false);
  };

  private clearKeys = () => {
    this.keys.w = false;
    this.keys.s = false;
    this.keys.a = false;
    this.keys.d = false;
    this.keys.space = false;
    this.touchKeys.w = false;
    this.touchKeys.s = false;
    this.touchKeys.a = false;
    this.touchKeys.d = false;
    this.touchKeys.space = false;
  };

  setTouchKey(key: keyof typeof this.touchKeys, pressed: boolean): void {
    if (this.touchKeys[key] === pressed) return;
    this.touchKeys[key] = pressed;
    if (pressed) this.onFirstInput?.();
  }

  requestReset(): void {
    this.clearKeys();
    this.onReset();
  }

  private set(e: KeyboardEvent, val: boolean) {
    switch (e.code) {
      case 'KeyW':
        this.keys.w = val;
        break;
      case 'KeyS':
        this.keys.s = val;
        break;
      case 'KeyA':
        this.keys.a = val;
        break;
      case 'KeyD':
        this.keys.d = val;
        break;
      case 'Space':
        this.keys.space = val;
        break;
    }
  }

  applyInput(dt: number) {
    let throttle = 0;
    if (this.keys.w || this.touchKeys.w) throttle += 1;
    if (this.keys.s || this.touchKeys.s) throttle -= 1;

    let steer = 0;
    if (this.keys.a || this.touchKeys.a) steer += 1;
    if (this.keys.d || this.touchKeys.d) steer -= 1;

    const input: DriveInput = {
      throttle,
      steer,
      braking: this.keys.space || this.touchKeys.space,
    };

    this.controller.applyInput(dt, input);
  }

  afterPhysics(dt: number) {
    this.controller.afterPhysics(dt);
  }
}
