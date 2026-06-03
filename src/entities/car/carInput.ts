import { CarController } from './carController';
import type { DriveInput } from './carController';

export class CarInput {
  private keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  };

  constructor(private controller: CarController) {
    window.addEventListener('keydown', (e) => this.set(e, true));
    window.addEventListener('keyup', (e) => this.set(e, false));
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

  update(dt: number) {
    let throttle = 0;
    if (this.keys.w) throttle += 1;
    if (this.keys.s) throttle -= 1;

    let steer = 0;
    if (this.keys.a) steer += 1;
    if (this.keys.d) steer -= 1;

    const input: DriveInput = {
      throttle,
      steer,
      braking: this.keys.space,
    };

    this.controller.update(dt, input);
  }
}
