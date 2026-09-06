export const STEP = 1 / 60;
export function moveShip(p, input, dt = STEP) {
  const x = Number(!!input.right) - Number(!!input.left);
  const y = Number(!!input.down) - Number(!!input.up);
  const n = Math.hypot(x, y) || 1;
  p.x = Math.max(20, Math.min(940, p.x + x / n * p.speed * dt));
  p.y = Math.max(30, Math.min(575, p.y + y / n * p.speed * dt));
  return p;
}
// Collision along relative motion catches projectiles crossing a target between ticks.
export function sweptHit(a, b, radius) {
  const x = (a.px ?? a.x) - (b.px ?? b.x), y = (a.py ?? a.y) - (b.py ?? b.y);
  const vx = a.x - b.x - x, vy = a.y - b.y - y;
  const t = Math.max(0, Math.min(1, -(x * vx + y * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(x + vx * t, y + vy * t) <= radius;
}
export function reconcile(authority, pending) {
  const p = { ...authority };
  if (p.hp > 0) for (const frame of pending) if (frame.seq > (p.ack ?? 0)) moveShip(p, frame.input);
  return p;
}
