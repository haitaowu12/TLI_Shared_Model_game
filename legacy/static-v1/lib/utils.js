export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function uniq(arr) {
  return Array.from(new Set(arr));
}

export function nowIso() {
  return new Date().toISOString();
}

export function pick(arr, idx) {
  if (!arr.length) return null;
  return arr[((idx % arr.length) + arr.length) % arr.length];
}

