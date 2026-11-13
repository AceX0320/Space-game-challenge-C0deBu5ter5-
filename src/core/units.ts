export function kgToT(kg: number): string { return `${(kg / 1000).toFixed(2)} t`; }
export function formatM(m: number): string { return `$${m.toFixed(1)}M`; }
export function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
export function round(value: number, decimals = 2): number { return Math.round(value * 10 ** decimals) / 10 ** decimals; }
