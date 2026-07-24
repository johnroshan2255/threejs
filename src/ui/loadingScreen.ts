export type LoadingScreen = {
  setStatus: (text: string) => void;
  setProgress: (ratio: number) => void;
  showStartButton: (onStart: () => void) => void;
  hide: () => void;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function createLoadingScreen(): LoadingScreen {
  const root = document.getElementById('loading-screen');
  const statusEl = document.getElementById('loading-status');
  const barEl = document.getElementById('loading-bar');
  const startBtn = document.getElementById('start-game-btn');
  const progressWrap = document.getElementById('loading-progress');

  if (!root || !statusEl || !barEl || !startBtn || !progressWrap) {
    throw new Error('Loading screen markup missing from index.html');
  }

  return {
    setStatus(text) {
      statusEl.textContent = text;
    },
    setProgress(ratio) {
      const pct = Math.round(clamp01(ratio) * 100);
      barEl.style.width = `${pct}%`;
      barEl.setAttribute('aria-valuenow', String(pct));
    },
    showStartButton(onStart) {
      progressWrap.hidden = true;
      statusEl.textContent = 'Ready';
      startBtn.hidden = false;
      startBtn.focus();

      const handleClick = () => {
        startBtn.removeEventListener('click', handleClick);
        onStart();
      };
      startBtn.addEventListener('click', handleClick);
    },
    hide() {
      root.classList.add('loading-screen--hidden');
      window.setTimeout(() => {
        root.remove();
      }, 420);
    },
  };
}
