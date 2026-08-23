const startedAt = Date.now();
let ready = false;

export function setRuntimeReady(value: boolean) {
  ready = value;
}

export function runtimeHealth() {
  return {
    ready,
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1_000)),
  };
}
