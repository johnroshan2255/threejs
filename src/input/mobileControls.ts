import type { CarInput } from '../entities/car/carInput';

export function isCoarsePointerDevice(): boolean {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window
  );
}

function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

function bindHoldButton(
  el: HTMLElement,
  onChange: (pressed: boolean) => void
): void {
  const press = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(true);
    el.setPointerCapture(e.pointerId);
  };
  const release = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(false);
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

export function createMobileControls(input: CarInput): void {
  if (!isCoarsePointerDevice()) return;

  const root = document.createElement('div');
  root.id = 'mobile-controls';
  root.innerHTML = `
    <div class="mobile-steer">
      <button type="button" class="mobile-btn mobile-btn-steer" data-action="left" aria-label="Steer left">◀</button>
      <button type="button" class="mobile-btn mobile-btn-steer" data-action="right" aria-label="Steer right">▶</button>
    </div>
    <div class="mobile-drive">
      <button type="button" class="mobile-btn mobile-btn-gas" data-action="gas" aria-label="Gas">▲</button>
      <button type="button" class="mobile-btn mobile-btn-brake" data-action="brake" aria-label="Brake">■</button>
    </div>
    <button type="button" class="mobile-btn mobile-btn-reset" data-action="reset" aria-label="Reset car">↺</button>
  `;
  document.body.appendChild(root);

  const portraitBlock = document.createElement('div');
  portraitBlock.id = 'portrait-block';
  portraitBlock.innerHTML = `
    <div class="portrait-block-inner">
      <span class="portrait-block-icon">↻</span>
      <p>Rotate your device</p>
      <p class="portrait-block-sub">Landscape mode required to drive</p>
    </div>
  `;
  document.body.appendChild(portraitBlock);

  const updateOrientation = () => {
    document.body.classList.toggle(
      'portrait-active',
      isPortrait() && isCoarsePointerDevice()
    );
  };
  window.addEventListener('resize', updateOrientation);
  window.addEventListener('orientationchange', updateOrientation);
  updateOrientation();

  const hint = document.getElementById('controls-hint');
  if (hint) {
    hint.textContent = 'Steer · Gas · Brake · ↺ reset';
  }

  const actionMap: Record<string, (pressed: boolean) => void> = {
    left: (p) => input.setTouchKey('a', p),
    right: (p) => input.setTouchKey('d', p),
    gas: (p) => input.setTouchKey('w', p),
    brake: (p) => input.setTouchKey('space', p),
  };

  root.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
    const action = btn.dataset.action;
    if (!action) return;

    if (action === 'reset') {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.requestReset();
      });
      return;
    }

    const onChange = actionMap[action];
    if (onChange) bindHoldButton(btn, onChange);
  });
}
