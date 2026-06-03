export function createKeyboard(): (key: string) => boolean {
  const keys = new Set<string>();

  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  return (key) => keys.has(key.toLowerCase());
}
