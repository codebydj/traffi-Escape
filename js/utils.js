/**
 * TRAFFIC ESCAPE — Utility Helper Functions
 */

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Axis-Aligned Bounding Box (AABB) Collision Detection with optional inset margins.
 * Inset margins allow forgiving hitboxes so players don't get frustrated by minor visual touches.
 */
export function checkAABB(r1, r2, insetX = 6, insetY = 8) {
  const box1 = {
    x: r1.x + insetX,
    y: r1.y + insetY,
    width: r1.width - insetX * 2,
    height: r1.height - insetY * 2
  };
  const box2 = {
    x: r2.x + insetX,
    y: r2.y + insetY,
    width: r2.width - insetX * 2,
    height: r2.height - insetY * 2
  };

  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function formatDistance(meters) {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + ' km';
  }
  return Math.floor(meters) + ' m';
}

export function formatScore(num) {
  return Math.floor(num).toLocaleString('en-US');
}
