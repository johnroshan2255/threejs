import type { WeatherSystem } from './weatherSystem';

export class WeatherInput {
  constructor(private weather: WeatherSystem) {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyP') {
      e.preventDefault();
      if (e.repeat) return;
      this.weather.resumeAudio();
      this.weather.cycleWeather();
      return;
    }
    if (
      e.code === 'KeyW' ||
      e.code === 'KeyA' ||
      e.code === 'KeyS' ||
      e.code === 'KeyD' ||
      e.code === 'Space'
    ) {
      this.weather.resumeAudio();
    }
  };
}
