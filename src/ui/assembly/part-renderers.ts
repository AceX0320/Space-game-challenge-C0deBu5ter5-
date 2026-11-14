import type { PartDef, PartInstance } from '@/types';

/**
 * Generates an SVG schematic for a part based on its category and tuned parameters.
 * Visual language matches Figma frame 21:704:
 * 1-1.5px hairline strokes, dark blueprint aesthetic, orange engine plumes,
 * mint and amber instruments, mono leader-line callouts.
 */
export function renderPartSvg(
  inst: PartInstance,
  def: PartDef,
  isSelected: boolean
): string {
  const strokeColor = isSelected ? 'var(--accent)' : 'var(--text)';
  const strokeWidth = isSelected ? 2 : 1.5;
  const p = inst.paramValues;

  switch (def.category) {
    case 'hull':
      return `
        <!-- Command Module / Avionics Bus -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-35" y="-30" width="70" height="60" fill="rgba(28,27,28,0.75)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Inner equipment rack -->
          <line x1="-25" y1="-15" x2="25" y2="-15" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 2" />
          <line x1="-25" y1="5" x2="25" y2="5" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 2" />
          <circle cx="0" cy="-5" r="8" fill="none" stroke="var(--ok)" stroke-width="1.2" />
          <text x="0" y="24" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8">AVIONICS BUS</text>
        </g>
      `;

    case 'tank': {
      const radius = 32;
      const height = 65;
      return `
        <!-- Propellant Tank -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Cylindrical tank body with rounded end domes -->
          <path d="M -${radius} -${height / 2 - 12}
                   A ${radius} 12 0 0 1 ${radius} -${height / 2 - 12}
                   L ${radius} ${height / 2 - 12}
                   A ${radius} 12 0 0 1 -${radius} ${height / 2 - 12} Z"
                fill="rgba(20,19,20,0.85)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Weld seams & baffles -->
          <line x1="-${radius}" y1="0" x2="${radius}" y2="0" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 2" />
          <text x="0" y="4" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8">PROPELLANT</text>
        </g>
      `;
    }

    case 'engine': {
      const count = Number(p['count'] ?? 1);
      const thrustScale = Number(p['thrustScale'] ?? 1);
      const gimbalDeg = Number(p['gimbalDeg'] ?? 0);
      const bellWidth = 24 * thrustScale;
      const bellHeight = 34 * thrustScale;

      const engineElements: string[] = [];
      const spacing = count > 1 ? 40 / (count - 1) : 0;
      const startX = count > 1 ? -20 : 0;

      for (let i = 0; i < count; i++) {
        const xOffset = count > 1 ? startX + i * spacing : 0;
        engineElements.push(`
          <g transform="translate(${xOffset}, 0) rotate(${i === 0 ? -gimbalDeg / 2 : gimbalDeg / 2})">
            <!-- Injector head -->
            <rect x="-6" y="0" width="12" height="6" fill="var(--border)" stroke="${strokeColor}" stroke-width="1" />
            <!-- Expansion Bell -->
            <path d="M -6 6 L -${bellWidth / 2} ${bellHeight} L ${bellWidth / 2} ${bellHeight} L 6 6 Z"
                  fill="rgba(255,90,31,0.1)" stroke="var(--accent)" stroke-width="${strokeWidth}" />
            <!-- Gimbal ring -->
            <circle cx="0" cy="3" r="3" fill="var(--bg-inset)" stroke="var(--accent)" stroke-width="1" />
            <!-- Hot Core Plume (Blueprint style) -->
            <path d="M -${bellWidth / 2 - 3} ${bellHeight + 2} L 0 ${bellHeight + 24} L ${bellWidth / 2 - 3} ${bellHeight + 2} Z"
                  fill="rgba(255,90,31,0.2)" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" />
          </g>
        `);
      }

      return `
        <!-- Engine Cluster -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          ${engineElements.join('')}
          <text x="0" y="${bellHeight + 36}" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="8">
            ${count}× GIMBAL NOZZLE
          </text>
        </g>
      `;
    }

    case 'leg': {
      return `
        <!-- Landing Gear Strut (Mirrored) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Left leg -->
          <line x1="-30" y1="0" x2="-65" y2="45" stroke="${strokeColor}" stroke-width="2.5" />
          <line x1="-48" y1="20" x2="-25" y2="25" stroke="var(--text-muted)" stroke-width="1.5" />
          <line x1="-75" y1="45" x2="-55" y2="45" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
          <!-- Right leg -->
          <line x1="30" y1="0" x2="65" y2="45" stroke="${strokeColor}" stroke-width="2.5" />
          <line x1="48" y1="20" x2="25" y2="25" stroke="var(--text-muted)" stroke-width="1.5" />
          <line x1="55" y1="45" x2="75" y2="45" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
          <!-- Footpad callout -->
          <text x="-65" y="58" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">PAD 01</text>
          <text x="65" y="58" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">PAD 02</text>
        </g>
      `;
    }

    case 'comms': {
      return `
        <!-- High/Low Gain Antenna -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <line x1="0" y1="0" x2="0" y2="-22" stroke="${strokeColor}" stroke-width="1.5" />
          <!-- Parabolic dish -->
          <path d="M -18 -28 A 20 12 0 0 1 18 -28" fill="none" stroke="${strokeColor}" stroke-width="1.8" />
          <!-- Feedhorn -->
          <line x1="0" y1="-28" x2="0" y2="-36" stroke="var(--ok)" stroke-width="1.2" />
          <circle cx="0" cy="-36" r="2.5" fill="var(--ok)" />
          <text x="24" y="-26" fill="var(--ok)" font-family="var(--font-mono)" font-size="7">DSN HIGH-GAIN</text>
        </g>
      `;
    }

    case 'power': {
      if (def.id.includes('solar')) {
        return `
          <!-- Deployable Solar Array -->
          <g class="part-svg-group" data-instance-id="${inst.instanceId}">
            <!-- Port Array -->
            <rect x="-85" y="-12" width="40" height="24" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
            <line x1="-65" y1="-12" x2="-65" y2="12" stroke="var(--border)" stroke-width="1" />
            <line x1="-45" y1="0" x2="-35" y2="0" stroke="${strokeColor}" stroke-width="2" />
            <!-- Starboard Array -->
            <rect x="45" y="-12" width="40" height="24" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
            <line x1="65" y1="-12" x2="65" y2="12" stroke="var(--border)" stroke-width="1" />
            <line x1="35" y1="0" x2="45" y2="0" stroke="${strokeColor}" stroke-width="2" />
            <text x="0" y="-18" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7">PHOTOVOLTAIC</text>
          </g>
        `;
      }
      return `
        <!-- Battery Unit -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-14" y="-8" width="28" height="16" fill="rgba(28,27,28,0.9)" stroke="${strokeColor}" stroke-width="1.2" />
          <circle cx="-6" cy="0" r="2" fill="var(--warn)" />
          <circle cx="6" cy="0" r="2" fill="var(--ok)" />
          <text x="18" y="4" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">BATT</text>
        </g>
      `;
    }

    case 'instrument': {
      return `
        <!-- Scientific Payload Package -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-16" y="-12" width="32" height="24" fill="rgba(28,27,28,0.95)" stroke="${strokeColor}" stroke-width="1.2" />
          <circle cx="0" cy="0" r="6" fill="none" stroke="var(--ok)" stroke-width="1.5" />
          <circle cx="0" cy="0" r="2" fill="var(--warn)" />
          <line x1="-10" y1="-12" x2="-10" y2="-18" stroke="var(--text-muted)" stroke-width="1" />
          <text x="0" y="22" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7">
            ${def.name.toUpperCase().substring(0, 10)}
          </text>
        </g>
      `;
    }

    case 'rcs': {
      return `
        <!-- RCS Quad Thrusters -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-42" y="-5" width="8" height="10" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
          <polygon points="-46,-8 -42,-4 -42,-6" fill="var(--warn)" />
          <polygon points="-46,8 -42,4 -42,6" fill="var(--warn)" />
          <rect x="34" y="-5" width="8" height="10" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
          <polygon points="46,-8 42,-4 42,-6" fill="var(--warn)" />
          <polygon points="46,8 42,4 42,6" fill="var(--warn)" />
        </g>
      `;
    }

    case 'heatshield': {
      return `
        <!-- Ablative Thermal Shield -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <path d="M -44 0 Q 0 16 44 0 L 40 -8 L -40 -8 Z" fill="rgba(224,53,53,0.15)" stroke="${strokeColor}" stroke-width="1.8" />
          <text x="0" y="14" text-anchor="middle" fill="var(--danger)" font-family="var(--font-mono)" font-size="7">TPS HEATSHIELD</text>
        </g>
      `;
    }

    case 'parachute': {
      return `
        <!-- Parachute Canister -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-12" y="-10" width="24" height="18" rx="4" fill="rgba(28,27,28,0.9)" stroke="${strokeColor}" stroke-width="1.2" />
          <path d="M -8 -10 Q 0 -20 8 -10" fill="none" stroke="var(--ok)" stroke-width="1.5" />
          <text x="0" y="2" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="6">CHUTE</text>
        </g>
      `;
    }

    case 'computer': {
      return `
        <!-- Flight Computer -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-12" y="-8" width="24" height="16" fill="rgba(28,27,28,0.9)" stroke="${strokeColor}" stroke-width="1" />
          <circle cx="-4" cy="0" r="2" fill="var(--ok)" />
          <circle cx="4" cy="0" r="2" fill="var(--ok)" />
        </g>
      `;
    }

    default:
      return `
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-20" y="-15" width="40" height="30" fill="rgba(28,27,28,0.8)" stroke="${strokeColor}" stroke-width="1" />
          <text x="0" y="4" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8">${def.name}</text>
        </g>
      `;
  }
}

/**
 * Renders a compact thumbnail icon for a part in the parts library.
 */
export function renderPartThumbnail(def: PartDef): string {
  switch (def.category) {
    case 'engine':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 6h10l-2 12H9L7 6z" stroke="var(--accent)" stroke-width="1.5"/><path d="M10 18l2 4 2-4" stroke="var(--accent)" stroke-width="1"/></svg>`;
    case 'tank':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="16" rx="3" stroke="var(--text)" stroke-width="1.5"/><line x1="6" y1="12" x2="18" y2="12" stroke="var(--border)" stroke-width="1"/></svg>`;
    case 'leg':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 6l7 12 7-12M2 18h6M16 18h6" stroke="var(--text-muted)" stroke-width="1.5"/></svg>`;
    case 'hull':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" stroke="var(--text)" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="var(--ok)" stroke-width="1.2"/></svg>`;
    case 'comms':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 10a10 8 0 0 1 16 0" stroke="var(--text)" stroke-width="1.5"/><circle cx="12" cy="5" r="2" fill="var(--ok)"/><line x1="12" y1="10" x2="12" y2="19" stroke="var(--text)" stroke-width="1.5"/></svg>`;
    case 'power':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="10" stroke="var(--ok)" stroke-width="1.5"/><line x1="9" y1="7" x2="9" y2="17" stroke="var(--ok)" stroke-width="1"/><line x1="15" y1="7" x2="15" y2="17" stroke="var(--ok)" stroke-width="1"/></svg>`;
    case 'instrument':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="var(--warn)" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="var(--warn)"/></svg>`;
    default:
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" stroke="var(--text-muted)" stroke-width="1.5"/></svg>`;
  }
}
