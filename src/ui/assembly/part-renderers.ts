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
    case 'hull': {
      const busSize = Number(p['busSize'] ?? 1);
      const w = Math.round(34 * busSize);
      const h = Math.round(27 * busSize);

      return `
        <!-- Command Module / Avionics Bus (1.2m core bus) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Octagonal service module shell -->
          <polygon points="-${w},-${h - 10} -${w - 12},-${h} ${w - 12},-${h} ${w},-${h - 10} ${w},${h - 4} ${w - 4},${h} -${w - 4},${h} -${w},${h - 4}"
                   fill="rgba(20,24,32,0.92)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Top Docking/Apex Collar -->
          <rect x="-18" y="-${h + 2}" width="36" height="3" fill="var(--bg-inset)" stroke="var(--border)" stroke-width="0.8" />
          <!-- Bottom Interstage Mating Flange -->
          <rect x="-${w}" y="${h - 2}" width="${w * 2}" height="3" fill="var(--bg-inset)" stroke="var(--border)" stroke-width="0.8" />
          <!-- Inner equipment rack lines -->
          <line x1="-${w - 10}" y1="-12" x2="${w - 10}" y2="-12" stroke="var(--border)" stroke-width="0.8" stroke-dasharray="3 2" />
          <line x1="-${w - 10}" y1="6" x2="${w - 10}" y2="6" stroke="var(--border)" stroke-width="0.8" stroke-dasharray="3 2" />
          <!-- Central core circle (avionics hub) -->
          <circle cx="0" cy="-2" r="8" fill="none" stroke="var(--ok)" stroke-width="1.2" />
          <circle cx="0" cy="-2" r="3" fill="var(--ok)" />
          <text x="0" y="${h - 8}" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" letter-spacing="0.5px">AVIONICS BUS</text>
        </g>
      `;
    }

    case 'tank': {
      const volume = Number(p['volume'] ?? 1);
      const radius = 34; // ~1.2m diameter in blueprint scale
      const height = Math.round(Math.max(50, Math.min(125, 52 * Math.sqrt(volume))));
      const domeH = 12;

      // Generate horizontal internal baffle lines
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
                fill="rgba(15,18,24,0.92)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Top Interstage Structural Collar -->
          <rect x="-${radius}" y="-${height / 2 + 1}" width="${radius * 2}" height="3"
                fill="var(--bg-inset)" stroke="var(--border)" stroke-width="0.8" />
          <!-- Bottom Thrust Interface Collar -->
          <rect x="-${radius}" y="${height / 2 - 2}" width="${radius * 2}" height="3"
                fill="var(--bg-inset)" stroke="var(--border)" stroke-width="0.8" />
          <!-- Tank internal baffles -->
          ${baffles.join('')}
          <!-- Vertical center datum alignment -->
          <line x1="0" y1="-${height / 2}" x2="0" y2="${height / 2}" stroke="rgba(0,180,240,0.18)" stroke-width="1" stroke-dasharray="2 3" />
          <text x="0" y="3" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8" letter-spacing="0.6px">PROPELLANT</text>
        </g>
      `;
    }

    case 'engine': {
      const count = Number(p['count'] ?? 1);
      const thrustScale = Number(p['thrustScale'] ?? 1);
      const bellWidth = 26 * thrustScale;
      const bellHeight = 34 * thrustScale;

      const engineElements: string[] = [];
      const spacing = count > 1 ? 38 / (count - 1) : 0;
      const startX = count > 1 ? -19 : 0;

      for (let i = 0; i < count; i++) {
        const xOffset = count > 1 ? startX + i * spacing : 0;
        engineElements.push(`
          <g transform="translate(${xOffset}, 0)">
            <!-- Injector Dome & Turbopump Manifold (Attaches flush to tank base) -->
            <rect x="-8" y="-6" width="16" height="6" rx="1" fill="var(--border)" stroke="${strokeColor}" stroke-width="1" />
            <circle cx="0" cy="-3" r="2" fill="var(--accent)" />
            <!-- Nozzle Throat & Expansion Bell (Orange per Figma 21:704) -->
            <path d="M -4 0 L -${bellWidth / 2} ${bellHeight} L ${bellWidth / 2} ${bellHeight} L 4 0 Z"
                  fill="rgba(255,90,31,0.14)" stroke="var(--accent)" stroke-width="${strokeWidth}" />
            <!-- Nozzle Gimbal Ring Actuator -->
            <line x1="-${bellWidth / 2 + 2}" y1="${bellHeight - 6}" x2="-${bellWidth / 2}" y2="${bellHeight}" stroke="var(--text-muted)" stroke-width="1" />
            <line x1="${bellWidth / 2 + 2}" y1="${bellHeight - 6}" x2="${bellWidth / 2}" y2="${bellHeight}" stroke="var(--text-muted)" stroke-width="1" />
            <!-- Hot Core Plume (Blueprint style) -->
            <path d="M -${bellWidth / 2 - 3} ${bellHeight + 2} L 0 ${bellHeight + 24} L ${bellWidth / 2 - 3} ${bellHeight + 2} Z"
                  fill="rgba(255,90,31,0.18)" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" />
            <line x1="0" y1="${bellHeight}" x2="0" y2="${bellHeight + 28}" stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2" />
          </g>
        `);
      }

      return `
        <!-- Main Rocket Engine & Expansion Bell -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          ${engineElements.join('')}
          <text x="0" y="${bellHeight + 36}" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="7" letter-spacing="0.5px">
            ${count > 1 ? `${count}× ENGINE CLUSTER` : 'VAC ENGINE NOZZLE'}
          </text>
        </g>
      `;
    }

    case 'leg': {
      return `
        <!-- Landing Gear Struts & Footpads (Flanking the Rocket Symmetrically) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Port Leg Strut (Originates on tank wall x = -34, lands at x = -68, y = 38) -->
          <g>
            <!-- Upper hinge mount on tank wall -->
            <circle cx="-34" cy="-6" r="3" fill="var(--border)" stroke="${strokeColor}" stroke-width="1.2" />
            <!-- Primary compression strut -->
            <line x1="-34" y1="-6" x2="-68" y2="38" stroke="${strokeColor}" stroke-width="2.5" />
            <!-- Hydraulic shock absorber cylinder -->
            <rect x="-56" y="10" width="8" height="18" transform="rotate(-38 -52 19)" fill="rgba(20,24,32,0.9)" stroke="var(--text-muted)" stroke-width="1" />
            <!-- Triangular bracing strut -->
            <line x1="-48" y1="18" x2="-22" y2="24" stroke="var(--border)" stroke-width="1.5" />
            <!-- Swivel ankle joint & horizontal footpad resting on datum -->
            <circle cx="-68" cy="38" r="2.5" fill="var(--ok)" />
            <line x1="-80" y1="38" x2="-56" y2="38" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
            <text x="-68" y="49" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" text-anchor="middle">PAD-L</text>
          </g>

          <!-- Starboard Leg Strut (Originates on tank wall x = 34, lands at x = 68, y = 38) -->
          <g>
            <!-- Upper hinge mount on tank wall -->
            <circle cx="34" cy="-6" r="3" fill="var(--border)" stroke="${strokeColor}" stroke-width="1.2" />
            <!-- Primary compression strut -->
            <line x1="34" y1="-6" x2="68" y2="38" stroke="${strokeColor}" stroke-width="2.5" />
            <!-- Hydraulic shock absorber cylinder -->
            <rect x="48" y="10" width="8" height="18" transform="rotate(38 52 19)" fill="rgba(20,24,32,0.9)" stroke="var(--text-muted)" stroke-width="1" />
            <!-- Triangular bracing strut -->
            <line x1="48" y1="18" x2="22" y2="24" stroke="var(--border)" stroke-width="1.5" />
            <!-- Swivel ankle joint & horizontal footpad resting on datum -->
            <circle cx="68" cy="38" r="2.5" fill="var(--ok)" />
            <line x1="56" y1="38" x2="80" y2="38" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
            <text x="68" y="49" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7" text-anchor="middle">PAD-R</text>
          </g>
        </g>
      `;
    }

    case 'comms': {
      return `
        <!-- High-Gain Deep Space Network Antenna Dish -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Mast & Gimbal base -->
          <line x1="0" y1="0" x2="0" y2="-16" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="0" cy="-16" r="3" fill="var(--border)" stroke="var(--ok)" stroke-width="1" />
          <!-- Parabolic Reflector Arc -->
          <path d="M -20 -26 A 22 12 0 0 1 20 -26" fill="rgba(97,221,160,0.06)" stroke="${strokeColor}" stroke-width="2" />
          <!-- Subreflector tripod & feedhorn -->
          <line x1="-10" y1="-26" x2="0" y2="-36" stroke="var(--border)" stroke-width="1" />
          <line x1="10" y1="-26" x2="0" y2="-36" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="-36" r="2" fill="var(--ok)" />
          <text x="24" y="-30" fill="var(--ok)" font-family="var(--font-mono)" font-size="7" font-weight="600">DSN HIGH-GAIN</text>
        </g>
      `;
    }

    case 'power': {
      if (def.id.includes('solar')) {
        return `
          <!-- Deployable Photovoltaic Solar Arrays (Flush against Hull/Tank walls) -->
          <g class="part-svg-group" data-instance-id="${inst.instanceId}">
            <!-- Port Array Wing (Attached to wall at x = -34) -->
            <g>
              <line x1="-34" y1="0" x2="-44" y2="0" stroke="${strokeColor}" stroke-width="2" />
              <rect x="-92" y="-12" width="48" height="24" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
              <!-- Photovoltaic cell grid lines -->
              <line x1="-76" y1="-12" x2="-76" y2="12" stroke="var(--border)" stroke-width="0.8" />
              <line x1="-60" y1="-12" x2="-60" y2="12" stroke="var(--border)" stroke-width="0.8" />
              <line x1="-92" y1="0" x2="-44" y2="0" stroke="var(--border)" stroke-width="0.8" />
            </g>
            <!-- Starboard Array Wing (Attached to wall at x = 34) -->
            <g>
              <line x1="34" y1="0" x2="44" y2="0" stroke="${strokeColor}" stroke-width="2" />
              <rect x="44" y="-12" width="48" height="24" fill="rgba(97,221,160,0.08)" stroke="${strokeColor}" stroke-width="1.2" />
              <!-- Photovoltaic cell grid lines -->
              <line x1="60" y1="-12" x2="60" y2="12" stroke="var(--border)" stroke-width="0.8" />
              <line x1="76" y1="-12" x2="76" y2="12" stroke="var(--border)" stroke-width="0.8" />
              <line x1="44" y1="0" x2="92" y2="0" stroke="var(--border)" stroke-width="0.8" />
            </g>
            <text x="0" y="-16" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7">PHOTOVOLTAIC ARRAY</text>
          </g>
        `;
      }
      return `
        <!-- High-Capacity Battery Pack -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-14" y="-10" width="28" height="20" rx="2" fill="rgba(20,24,32,0.92)" stroke="${strokeColor}" stroke-width="1.2" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="var(--border)" stroke-width="1" />
          <circle cx="-6" cy="-4" r="2" fill="var(--warn)" />
          <circle cx="6" cy="-4" r="2" fill="var(--ok)" />
          <text x="0" y="8" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">BATTERY</text>
        </g>
      `;
    }

    case 'instrument': {
      return `
        <!-- Scientific Sensor Package (Spectrometer / Camera / Sensor) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-16" y="-12" width="32" height="24" rx="2" fill="rgba(20,24,32,0.95)" stroke="${strokeColor}" stroke-width="1.2" />
          <!-- Optical lens / sensor housing -->
          <circle cx="0" cy="0" r="6" fill="rgba(97,221,160,0.12)" stroke="var(--ok)" stroke-width="1.5" />
          <circle cx="0" cy="0" r="2" fill="var(--warn)" />
          <text x="0" y="20" text-anchor="middle" fill="var(--ok)" font-family="var(--font-mono)" font-size="7" font-weight="600">
            ${def.name.toUpperCase().substring(0, 12)}
          </text>
        </g>
      `;
    }

    case 'rcs': {
      return `
        <!-- RCS Quad Cold-Gas Attitude Thrusters (Flush to Left & Right Walls) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Port thruster block (Mounted at x = -34) -->
          <g>
            <rect x="-42" y="-6" width="8" height="12" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
            <polygon points="-46,-8 -42,-4 -42,-6" fill="var(--warn)" />
            <polygon points="-46,8 -42,4 -42,6" fill="var(--warn)" />
            <polygon points="-46,0 -42,-2 -42,2" fill="var(--warn)" />
          </g>
          <!-- Starboard thruster block (Mounted at x = 34) -->
          <g>
            <rect x="34" y="-6" width="8" height="12" fill="var(--bg-inset)" stroke="${strokeColor}" stroke-width="1" />
            <polygon points="46,-8 42,-4 42,-6" fill="var(--warn)" />
            <polygon points="46,8 42,4 42,6" fill="var(--warn)" />
            <polygon points="46,0 42,-2 42,2" fill="var(--warn)" />
          </g>
          <text x="0" y="15" text-anchor="middle" fill="var(--warn)" font-family="var(--font-mono)" font-size="7">RCS ATTITUDE</text>
        </g>
      `;
    }

    case 'heatshield': {
      return `
        <!-- Thermal Ablative Heatshield (Curved Base Protection) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <path d="M -36 -4 Q 0 10 36 -4 L 34 -8 Q 0 4 -34 -8 Z"
                fill="rgba(255,90,31,0.22)" stroke="var(--accent)" stroke-width="1.8" />
          <line x1="-24" y1="-2" x2="24" y2="-2" stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="3 2" />
          <text x="0" y="16" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="7">HEATSHIELD</text>
        </g>
      `;
    }

    case 'parachute': {
      return `
        <!-- Aerodynamic Nose Cone Parachute Assembly (Apex) -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <!-- Conical streamlined nosecone fairing -->
          <path d="M -20 8 L 0 -14 L 20 8 Z"
                fill="rgba(20,24,32,0.95)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <!-- Ejection line & deployment lanyard -->
          <line x1="-12" y1="2" x2="12" y2="2" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="-4" r="2.5" fill="var(--accent)" />
          <text x="0" y="18" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="7">PARACHUTE APEX</text>
        </g>
      `;
    }

    case 'computer': {
      return `
        <!-- Avionics Guidance & Navigation Unit -->
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-14" y="-10" width="28" height="20" rx="1" fill="rgba(20,24,32,0.92)" stroke="${strokeColor}" stroke-width="1.2" />
          <!-- Microcontroller bus lines -->
          <line x1="-10" y1="-5" x2="10" y2="-5" stroke="var(--ok)" stroke-width="0.8" />
          <line x1="-10" y1="0" x2="10" y2="0" stroke="var(--border)" stroke-width="0.8" />
          <line x1="-10" y1="5" x2="10" y2="5" stroke="var(--ok)" stroke-width="0.8" />
          <circle cx="6" cy="2" r="1.5" fill="var(--ok)" />
          <text x="0" y="18" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="7">FLIGHT CPU</text>
        </g>
      `;
    }

    default:
      return `
        <g class="part-svg-group" data-instance-id="${inst.instanceId}">
          <rect x="-16" y="-12" width="32" height="24" rx="2" fill="rgba(20,24,32,0.85)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
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
          <rect x="-8" y="-6" width="16" height="6" fill="rgba(255,90,31,0.15)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
          <path d="M -4 0 L -13 34 L 13 34 L 4 0 Z" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'tank':
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-34" y="-28" width="68" height="56" rx="8" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'hull':
      return `
        <g class="part-ghost" opacity="0.6">
          <polygon points="-34,-18 -22,-27 22,-27 34,-18 34,24 28,27 -28,27 -34,24"
                   fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="3 2" />
        </g>
      `;
    case 'leg':
      return `
        <g class="part-ghost" opacity="0.6">
          <line x1="-34" y1="-6" x2="-68" y2="38" stroke="${ghostColor}" stroke-width="2" stroke-dasharray="3 2" />
          <line x1="-80" y1="38" x2="-56" y2="38" stroke="${ghostColor}" stroke-width="2.5" />
          <line x1="34" y1="-6" x2="68" y2="38" stroke="${ghostColor}" stroke-width="2" stroke-dasharray="3 2" />
          <line x1="56" y1="38" x2="80" y2="38" stroke="${ghostColor}" stroke-width="2.5" />
        </g>
      `;
    case 'power':
      return `
        <g class="part-ghost" opacity="0.6">
          <rect x="-92" y="-12" width="48" height="24" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
          <rect x="44" y="-12" width="48" height="24" fill="rgba(255,90,31,0.1)" stroke="${ghostColor}" stroke-width="1.2" stroke-dasharray="2 2" />
        </g>
      `;
    case 'comms':
      return `
        <g class="part-ghost" opacity="0.6">
          <path d="M -18 -24 A 20 12 0 0 1 18 -24" fill="none" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="2 2" />
          <circle cx="0" cy="-32" r="3" fill="var(--accent)" />
        </g>
      `;
    case 'parachute':
      return `
        <g class="part-ghost" opacity="0.6">
          <path d="M -20 8 L 0 -14 L 20 8 Z" fill="rgba(255,90,31,0.12)" stroke="${ghostColor}" stroke-width="1.5" stroke-dasharray="2 2" />
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
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polygon points="7,4 17,4 20,9 20,18 17,21 7,21 4,18 4,9" stroke="var(--text)" stroke-width="1.5"/><circle cx="12" cy="12" r="3" stroke="var(--ok)" stroke-width="1"/></svg>`;
    case 'power':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="7" height="10" stroke="var(--ok)" stroke-width="1.2"/><rect x="14" y="7" width="7" height="10" stroke="var(--ok)" stroke-width="1.2"/><line x1="10" y1="12" x2="14" y2="12" stroke="var(--text-muted)" stroke-width="1.2"/></svg>`;
    case 'rcs':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="var(--warn)" stroke-width="1.5"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5" stroke="var(--warn)" stroke-width="1.2"/></svg>`;
    case 'comms':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 10a10 10 0 0 1 14 0" stroke="var(--ok)" stroke-width="1.5"/><line x1="12" y1="13" x2="12" y2="21" stroke="var(--text)" stroke-width="1.5"/><circle cx="12" cy="10" r="2" fill="var(--ok)"/></svg>`;
    case 'parachute':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0 1 16 0z" stroke="var(--accent)" stroke-width="1.5"/><line x1="4" y1="12" x2="12" y2="19" stroke="var(--text-muted)" stroke-width="1"/><line x1="20" y1="12" x2="12" y2="19" stroke="var(--text-muted)" stroke-width="1"/></svg>`;
    default:
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="var(--text-muted)" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="var(--text-muted)"/></svg>`;
  }
}
