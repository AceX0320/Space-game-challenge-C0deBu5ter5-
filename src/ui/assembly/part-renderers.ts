import type { PartDef, PartInstance } from '@/types';

/**
 * Generates an SVG schematic for a part based on its category and tuned parameters.
 * Visual language strictly matches Figma frame 21:704:
 * 1-1.5px hairline strokes, dark blueprint aesthetic, orange engine plumes,
 * mint and amber instruments, mono leader-line callouts, real-world meter proportions.
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
        <!-- Command Module / Avionics Bus (1.2m core bus) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Octagonal service module shell -->
          <polygon points="-36,-26 -26,-36 26,-36 36,-26 36,26 26,36 -26,36 -36,26"
                   fill="rgba(20,22,28,0.85)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Inner equipment rack lines -->
          <line x1="-24" y1="-18" x2="24" y2="-18" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2" />
          <line x1="-24" y1="0" x2="24" y2="0" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2" />
          <line x1="-24" y1="18" x2="24" y2="18" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2" />
          <!-- Central core circle (avionics hub) -->
          <circle cx="0" cy="0" r="9" fill="none" stroke="var(--ok)" stroke-width="1.2" />
          <circle cx="0" cy="0" r="3" fill="var(--ok)" />
          <text x="0" y="28" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" letter-spacing="0.5px">AVIONICS BUS</text>
        </g>
      `;

    case 'tank': {
      const volume = Number(p['volume'] ?? 1);
      const radius = 34; // ~1.2m diameter in blueprint scale
      const height = Math.max(50, Math.min(125, 50 * Math.sqrt(volume)));
      const domeH = 14;

      // Generate horizontal internal baffle/hatch lines
      const baffles: string[] = [];
      const numBaffles = Math.max(2, Math.floor(height / 22));
      for (let i = 1; i < numBaffles; i++) {
        const by = -height / 2 + (height / numBaffles) * i;
        baffles.push(`<line x1="-${radius - 2}" y1="${by}" x2="${radius - 2}" y2="${by}" stroke="var(--border)" stroke-width="0.8" stroke-dasharray="4 2" />`);
      }

      return `
        <!-- Propellant Tank (Scaled by volume parameter) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Cylindrical tank body with rounded hemispherical end domes -->
          <path d="M -${radius} -${height / 2 - domeH}
                   A ${radius} ${domeH} 0 0 1 ${radius} -${height / 2 - domeH}
                   L ${radius} ${height / 2 - domeH}
                   A ${radius} ${domeH} 0 0 1 -${radius} ${height / 2 - domeH} Z"
                fill="rgba(15,18,24,0.9)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Tank internal baffles -->
          ${baffles.join('')}
          <!-- Vertical center datum alignment -->
          <line x1="0" y1="-${height / 2}" x2="0" y2="${height / 2}" stroke="rgba(0,180,240,0.15)" stroke-width="1" stroke-dasharray="2 3" />
          <text x="0" y="3" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8" letter-spacing="0.6px">PROPELLANT</text>
        </g>
      `;
    }

    case 'engine': {
      const count = Number(p['count'] ?? 1);
      const thrustScale = Number(p['thrustScale'] ?? 1);
      const bellWidth = 26 * thrustScale;
      const bellHeight = 36 * thrustScale;

      const engineElements: string[] = [];
      const spacing = count > 1 ? 40 / (count - 1) : 0;
      const startX = count > 1 ? -20 : 0;

      for (let i = 0; i < count; i++) {
        const xOffset = count > 1 ? startX + i * spacing : 0;
        engineElements.push(`
          <g transform="translate(${xOffset}, 0)">
            <!-- Injector Dome & Turbopump Manifold -->
            <rect x="-7" y="0" width="14" height="6" rx="1" fill="var(--border)" stroke="${strokeColor}" stroke-width="1" />
            <circle cx="0" cy="3" r="2" fill="var(--accent)" />
            <!-- Nozzle Throat & Expansion Bell (Orange per Figma 21:704) -->
            <path d="M -4 6 L -${bellWidth / 2} ${bellHeight} L ${bellWidth / 2} ${bellHeight} L 4 6 Z"
                  fill="rgba(255,90,31,0.12)" stroke="var(--accent)" stroke-width="${strokeWidth}" />
            <!-- Nozzle Gimbal Ring Actuator -->
            <line x1="-${bellWidth / 2 + 3}" y1="${bellHeight - 6}" x2="-${bellWidth / 2 + 1}" y2="${bellHeight}" stroke="var(--text-muted)" stroke-width="1.2" />
            <line x1="${bellWidth / 2 + 3}" y1="${bellHeight - 6}" x2="${bellWidth / 2 + 1}" y2="${bellHeight}" stroke="var(--text-muted)" stroke-width="1.2" />
            <!-- Hot Core Plume (Blueprint style) -->
            <path d="M -${bellWidth / 2 - 4} ${bellHeight + 2} L 0 ${bellHeight + 28} L ${bellWidth / 2 - 4} ${bellHeight + 2} Z"
                  fill="rgba(255,90,31,0.18)" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" />
            <line x1="0" y1="${bellHeight}" x2="0" y2="${bellHeight + 32}" stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2" />
          </g>
        `);
      }

      return `
        <!-- Main Rocket Engine & Expansion Bell -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          ${engineElements.join('')}
          <text x="0" y="${bellHeight + 42}" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="7" letter-spacing="0.5px">
            ${count > 1 ? `${count}× ENGINE CLUSTER` : 'VAC ENGINE NOZZLE'}
          </text>
        </g>
      `;
    }

    case 'leg': {
      return `
        <!-- Landing Gear Struts & Footpads (Resting directly on Ground Datum) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Port Leg Strut -->
          <g>
            <!-- Upper hinge mount -->
            <circle cx="-32" cy="-4" r="3" fill="var(--border)" stroke="${strokeColor}" stroke-width="1.2" />
            <!-- Primary compression strut -->
            <line x1="-32" y1="-4" x2="-68" y2="40" stroke="${strokeColor}" stroke-width="2.5" />
            <!-- Hydraulic shock absorber cylinder -->
            <rect x="-56" y="10" width="8" height="18" transform="rotate(-36 -52 19)" fill="rgba(20,22,28,0.9)" stroke="var(--text-muted)" stroke-width="1" />
            <!-- Triangular bracing strut -->
            <line x1="-48" y1="18" x2="-22" y2="24" stroke="var(--border)" stroke-width="1.5" />
            <!-- Swivel ankle joint & footpad -->
            <circle cx="-68" cy="40" r="2.5" fill="var(--ok)" />
            <line x1="-80" y1="40" x2="-56" y2="40" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
            <text x="-68" y="52" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" text-anchor="middle">PAD-L</text>
          </g>

          <!-- Starboard Leg Strut -->
          <g>
            <!-- Upper hinge mount -->
            <circle cx="32" cy="-4" r="3" fill="var(--border)" stroke="${strokeColor}" stroke-width="1.2" />
            <!-- Primary compression strut -->
            <line x1="32" y1="-4" x2="68" y2="40" stroke="${strokeColor}" stroke-width="2.5" />
            <!-- Hydraulic shock absorber cylinder -->
            <rect x="48" y="10" width="8" height="18" transform="rotate(36 52 19)" fill="rgba(20,22,28,0.9)" stroke="var(--text-muted)" stroke-width="1" />
            <!-- Triangular bracing strut -->
            <line x1="48" y1="18" x2="22" y2="24" stroke="var(--border)" stroke-width="1.5" />
            <!-- Swivel ankle joint & footpad -->
            <circle cx="68" cy="40" r="2.5" fill="var(--ok)" />
            <line x1="56" y1="40" x2="80" y2="40" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
            <text x="68" y="52" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" text-anchor="middle">PAD-R</text>
          </g>
        </g>
      `;
    }

    case 'comms': {
      return `
        <!-- High-Gain Deep Space Network Antenna Dish -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Mast & Gimbal base -->
          <line x1="0" y1="0" x2="0" y2="-18" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="0" cy="-18" r="3" fill="var(--border)" stroke="var(--ok)" stroke-width="1" />
          <!-- Parabolic Reflector Arc -->
          <path d="M -22 -28 A 24 14 0 0 1 22 -28" fill="rgba(97,221,160,0.06)" stroke="${strokeColor}" stroke-width="2" />
          <!-- Subreflector tripod & feedhorn -->
          <line x1="-12" y1="-28" x2="0" y2="-40" stroke="var(--border)" stroke-width="1" />
          <line x1="12" y1="-28" x2="0" y2="-40" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="-40" r="2.5" fill="var(--ok)" />
          <text x="24" y="-34" fill="var(--ok)" font-family="var(--font-mono)" font-size="7" font-weight="600">DSN HIGH-GAIN</text>
        </g>
      `;
    }

    case 'power': {
      if (def.id.includes('solar')) {
        return `
          <!-- Deployable Photovoltaic Solar Arrays -->
          <g class="part-svg-group" data-instance-id="${inst.instanceId}">
            <!-- Port Array Wing -->
            <g>
              <line x1="-35" y1="0" x2="-45" y2="0" stroke="${strokeColor}" stroke-width="2" />
              <rect x="-95" y="-14" width="50" height="28" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
              <!-- Photovoltaic cell grid lines -->
              <line x1="-78" y1="-14" x2="-78" y2="14" stroke="var(--border)" stroke-width="0.8" />
              <line x1="-61" y1="-14" x2="-61" y2="14" stroke="var(--border)" stroke-width="0.8" />
              <line x1="-95" y1="0" x2="-45" y2="0" stroke="var(--border)" stroke-width="0.8" />
            </g>
            <!-- Starboard Array Wing -->
            <g>
              <line x1="35" y1="0" x2="45" y2="0" stroke="${strokeColor}" stroke-width="2" />
              <rect x="45" y="-14" width="50" height="28" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
              <!-- Photovoltaic cell grid lines -->
              <line x1="62" y1="-14" x2="62" y2="14" stroke="var(--border)" stroke-width="0.8" />
              <line x1="79" y1="-14" x2="79" y2="14" stroke="var(--border)" stroke-width="0.8" />
              <line x1="45" y1="0" x2="95" y2="0" stroke="var(--border)" stroke-width="0.8" />
            </g>
            <text x="0" y="-18" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7">PHOTOVOLTAIC ARRAY</text>
          </g>
        `;
      }
      return `
        <!-- High-Capacity Battery Pack -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-16" y="-10" width="32" height="20" rx="2" fill="rgba(20,22,28,0.9)" stroke="${strokeColor}" stroke-width="1.2" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke="var(--border)" stroke-width="1" />
          <circle cx="-8" cy="-4" r="2" fill="var(--warn)" />
          <circle cx="8" cy="-4" r="2" fill="var(--ok)" />
          <text x="0" y="8" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">BATTERY</text>
        </g>
      `;
    }

    case 'instrument': {
      return `
        <!-- Scientific Sensor Package (Spectrometer / Camera / Sensor) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-18" y="-14" width="36" height="28" rx="2" fill="rgba(20,22,28,0.95)" stroke="${strokeColor}" stroke-width="1.2" />
          <!-- Optical lens / sensor housing -->
          <circle cx="0" cy="0" r="7" fill="rgba(97,221,160,0.12)" stroke="var(--ok)" stroke-width="1.5" />
          <circle cx="0" cy="0" r="2.5" fill="var(--warn)" />
          <!-- Thermal standoff bracket -->
          <line x1="-12" y1="-14" x2="-12" y2="-20" stroke="var(--text-muted)" stroke-width="1" />
          <text x="0" y="24" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7" font-weight="600">
            ${def.name.toUpperCase().substring(0, 12)}
          </text>
        </g>
      `;
    }

    case 'rcs': {
      return `
        <!-- RCS Quad Cold-Gas Attitude Thrusters -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Port thruster block -->
          <g>
            <rect x="-44" y="-6" width="10" height="12" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
            <polygon points="-48,-9 -44,-5 -44,-7" fill="var(--warn)" />
            <polygon points="-48,9 -44,5 -44,7" fill="var(--warn)" />
          </g>
          <!-- Starboard thruster block -->
          <g>
            <rect x="34" y="-6" width="10" height="12" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
            <polygon points="48,-9 44,-5 44,-7" fill="var(--warn)" />
            <polygon points="48,9 44,5 44,7" fill="var(--warn)" />
          </g>
          <text x="0" y="16" text-anchor="middle" fill="var(--warn)" font-family="var(--font-mono)" font-size="7">RCS ATTITUDE</text>
        </g>
      `;
    }

    case 'heatshield': {
      return `
        <!-- PICA-X Thermal Ablative Heatshield -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <path d="M -42 0 Q 0 16 42 0 L 38 -6 Q 0 8 -38 -6 Z"
                fill="rgba(255,90,31,0.2)" stroke="var(--accent)" stroke-width="1.8" />
          <text x="0" y="14" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="7">HEATSHIELD</text>
        </g>
      `;
    }

    case 'parachute': {
      return `
        <!-- Supersonic Drogue & Main Parachute Canister -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-14" y="-12" width="28" height="20" rx="4" fill="rgba(20,22,28,0.9)" stroke="${strokeColor}" stroke-width="1.2" />
          <path d="M -9 -12 Q 0 -22 9 -12" fill="none" stroke="var(--ok)" stroke-width="1.5" />
          <text x="0" y="2" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="6">CHUTE</text>
        </g>
      `;
    }

    case 'computer': {
      return `
        <!-- Fault-Tolerant Flight Guidance Computer -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-14" y="-10" width="28" height="20" fill="rgba(20,22,28,0.9)" stroke="${strokeColor}" stroke-width="1.2" />
          <circle cx="-5" cy="-2" r="2" fill="var(--ok)" />
          <circle cx="5" cy="-2" r="2" fill="var(--ok)" />
          <line x1="-10" y1="4" x2="10" y2="4" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 1" />
          <text x="0" y="18" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="6">GUIDANCE</text>
        </g>
      `;
    }

    default:
      return `
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-24" y="-16" width="48" height="32" fill="rgba(20,22,28,0.8)" stroke="${strokeColor}" stroke-width="1.2" />
          <text x="0" y="4" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8">${def.name}</text>
        </g>
      `;
  }
}

/**
 * Generates a translucent ghost outline of a part for the slot preview on hover/drag.
 */
export function renderPartGhost(def: PartDef): string {
  const ghostColor = 'var(--accent)';

  switch (def.category) {
    case 'engine':
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-6" y="0" width="12" height="6" fill="rgba(255,90,31,0.15)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
          <path d="M -4 6 L -14 36 L 14 36 L 4 6 Z" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'tank':
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-32" y="-30" width="64" height="60" rx="10" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'hull':
      return `
        <g class="part-ghost" opacity="0.6">
          <polygon points="-32,-22 -22,-32 22,-32 32,-22 32,22 22,32 -22,32 -32,22"
                   fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'leg':
      return `
        <g class="part-ghost" opacity="0.6">
          <line x1="-30" y1="0" x2="-65" y2="40" stroke="${ghostColor}" stroke-width="2" stroke-dasharray="3 2" />
          <line x1="-75" y1="40" x2="-55" y2="40" stroke="${ghostColor}" stroke-width="2.5" />
          <line x1="30" y1="0" x2="65" y2="40" stroke="${ghostColor}" stroke-width="2" stroke-dasharray="3 2" />
          <line x1="55" y1="40" x2="75" y2="40" stroke="${ghostColor}" stroke-width="2.5" />
        </g>
      `;
    case 'power':
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-85" y="-12" width="40" height="24" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
          <rect x="45" y="-12" width="40" height="24" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
        </g>
      `;
    case 'comms':
      return `
        <g class="part-ghost" opacity="0.6">
          <path d="M -18 -24 A 20 12 0 0 1 18 -24" fill="none" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="2 2" />
          <circle cx="0" cy="-32" r="3" fill="var(--accent)" />
        </g>
      `;
    default:
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-16" y="-12" width="32" height="24" rx="2" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
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
