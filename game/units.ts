/**
 * SI → human-readable formatting for HUD and logs.
 *
 * Conventions:
 *   - Input is always SI (m, m/s, kg, N, s, m/s², radians or degrees as noted).
 *   - Output is a single string with the unit appended.
 *   - Precision is 2 decimals for scaled units, 1 for base units.
 *   - Negative zero is normalized to positive zero ("-0.00" → "0.00").
 *   - Non-finite input (NaN, Infinity) passes through as String(x); the HUD
 *     should surface these rather than hide them.
 */

const G0 = 9.80665; // standard gravity, m/s²

/** Number to fixed decimals, with "−0.0…" normalized to "0.0…". */
function num(v: number, decimals: number): string {
  const s = v.toFixed(decimals);
  return /^-0\.0+$/.test(s) ? s.slice(1) : s;
}

/** Distance: m, km, Mm, Gm. */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return String(m);
  const a = Math.abs(m);
  if (a >= 1e9) return num(m / 1e9, 2) + ' Gm';
  if (a >= 1e6) return num(m / 1e6, 2) + ' Mm';
  if (a >= 1e3) return num(m / 1e3, 2) + ' km';
  return num(m, 1) + ' m';
}

/** Speed: m/s, km/s. */
export function formatSpeed(mps: number): string {
  if (!Number.isFinite(mps)) return String(mps);
  const a = Math.abs(mps);
  if (a >= 1e3) return num(mps / 1e3, 2) + ' km/s';
  return num(mps, 1) + ' m/s';
}

/** Mass: kg, t, kt, Mt, Gt, Tt, Pt, Et, Zt. (1 t = 1000 kg.) */
export function formatMass(kg: number): string {
  if (!Number.isFinite(kg)) return String(kg);
  const a = Math.abs(kg);
  if (a >= 1e24) return num(kg / 1e24, 2) + ' Zt';
  if (a >= 1e21) return num(kg / 1e21, 2) + ' Et';
  if (a >= 1e18) return num(kg / 1e18, 2) + ' Pt';
  if (a >= 1e15) return num(kg / 1e15, 2) + ' Tt';
  if (a >= 1e12) return num(kg / 1e12, 2) + ' Gt';
  if (a >= 1e9)  return num(kg / 1e9,  2) + ' Mt';
  if (a >= 1e6)  return num(kg / 1e6,  2) + ' kt';
  if (a >= 1e3)  return num(kg / 1e3,  2) + ' t';
  return num(kg, 1) + ' kg';
}

/** Force: N, kN, MN, GN. */
export function formatForce(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  if (a >= 1e9) return num(n / 1e9, 2) + ' GN';
  if (a >= 1e6) return num(n / 1e6, 2) + ' MN';
  if (a >= 1e3) return num(n / 1e3, 2) + ' kN';
  return num(n, 1) + ' N';
}

/** Time: ms, s, min, h, d. */
export function formatTime(s: number): string {
  if (!Number.isFinite(s)) return String(s);
  const a = Math.abs(s);
  if (a >= 86400) return num(s / 86400, 2) + ' d';
  if (a >= 3600)  return num(s / 3600,  2) + ' h';
  if (a >= 60)    return num(s / 60,    2) + ' min';
  if (a >= 1)     return num(s,         2) + ' s';
  return num(s * 1000, 0) + ' ms';
}

/** Acceleration in SI (m/s²). */
export function formatAcceleration(mps2: number): string {
  if (!Number.isFinite(mps2)) return String(mps2);
  return num(mps2, 2) + ' m/s²';
}

/** Acceleration expressed as g-force (1 g = 9.80665 m/s²). */
export function formatGForce(mps2: number): string {
  if (!Number.isFinite(mps2)) return String(mps2);
  return num(mps2 / G0, 2) + ' g';
}

/** Angle in degrees, from a value already in degrees. */
export function formatAngleDeg(deg: number): string {
  if (!Number.isFinite(deg)) return String(deg);
  return num(deg, 1) + '°';
}

/** Angle in degrees, from a value in radians. */
export function formatAngleRad(rad: number): string {
  if (!Number.isFinite(rad)) return String(rad);
  return num((rad * 180) / Math.PI, 1) + '°';
}

/** Ratio (0..1 or any positive) as a percentage, e.g. throttle or fuel. */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return String(ratio);
  return num(ratio * 100, 1) + '%';
}