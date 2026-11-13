const G0 = 9.80665; // standard gravity, m/s²

function num(v: number, decimals: number): string {
  const s = v.toFixed(decimals);
  return /^-0\.0+$/.test(s) ? s.slice(1) : s;
}

export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return String(m);
  const a = Math.abs(m);
  if (a >= 1e9) return num(m / 1e9, 2) + ' Gm';
  if (a >= 1e6) return num(m / 1e6, 2) + ' Mm';
  if (a >= 1e3) return num(m / 1e3, 2) + ' km';
  return num(m, 1) + ' m';
}

export function formatSpeed(mps: number): string {
  if (!Number.isFinite(mps)) return String(mps);
  const a = Math.abs(mps);
  if (a >= 1e3) return num(mps / 1e3, 2) + ' km/s';
  return num(mps, 1) + ' m/s';
}

export function formatMass(kg: number): string {
  if (!Number.isFinite(kg)) return String(kg);
  const a = Math.abs(kg);
  if (a >= 1e24) return num(kg / 1e24, 2) + ' Zt';
  if (a >= 1e21) return num(kg / 1e21, 2) + ' Et';
  if (a >= 1e18) return num(kg / 1e18, 2) + ' Pt';
  if (a >= 1e15) return num(kg / 1e15, 2) + ' Tt';
  if (a >= 1e12) return num(kg / 1e12, 2) + ' Gt';
  if (a >= 1e9) return num(kg / 1e9, 2) + ' Mt';
  if (a >= 1e6) return num(kg / 1e6, 2) + ' kt';
  if (a >= 1e3) return num(kg / 1e3, 2) + ' t';
  return num(kg, 1) + ' kg';
}

export function formatForce(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  if (a >= 1e9) return num(n / 1e9, 2) + ' GN';
  if (a >= 1e6) return num(n / 1e6, 2) + ' MN';
  if (a >= 1e3) return num(n / 1e3, 2) + ' kN';
  return num(n, 1) + ' N';
}

export function formatTime(s: number): string {
  if (!Number.isFinite(s)) return String(s);
  const a = Math.abs(s);
  if (a >= 86400) return num(s / 86400, 2) + ' d';
  if (a >= 3600) return num(s / 3600, 2) + ' h';
  if (a >= 60) return num(s / 60, 2) + ' min';
  if (a >= 1) return num(s, 2) + ' s';
  return num(s * 1000, 0) + ' ms';
}

export function formatAcceleration(mps2: number): string {
  if (!Number.isFinite(mps2)) return String(mps2);
  return num(mps2, 2) + ' m/s²';
}

export function formatGForce(mps2: number): string {
  if (!Number.isFinite(mps2)) return String(mps2);
  return num(mps2 / G0, 2) + ' g';
}

export function formatAngleDeg(deg: number): string {
  if (!Number.isFinite(deg)) return String(deg);
  return num(deg, 1) + '°';
}

export function formatAngleRad(rad: number): string {
  if (!Number.isFinite(rad)) return String(rad);
  return num((rad * 180) / Math.PI, 1) + '°';
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return String(ratio);
  return num(ratio * 100, 1) + '%';
}
