import { AREAS, AREA_LABELS, type Area } from '../../../shared/areas';
import type { Coverage } from '../../../shared/schema';

const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER = 100;
const INNER = 34;
const STEP = (2 * Math.PI) / AREAS.length;

/** SVG path for one wedge of the ring. */
function wedgePath(index: number): string {
  const start = index * STEP - Math.PI / 2 + 0.03;
  const end = (index + 1) * STEP - Math.PI / 2 - 0.03;
  const point = (radius: number, angle: number) =>
    `${CENTER + radius * Math.cos(angle)} ${CENTER + radius * Math.sin(angle)}`;
  return [
    `M ${point(INNER, start)}`,
    `L ${point(OUTER, start)}`,
    `A ${OUTER} ${OUTER} 0 0 1 ${point(OUTER, end)}`,
    `L ${point(INNER, end)}`,
    `A ${INNER} ${INNER} 0 0 0 ${point(INNER, start)}`,
    'Z',
  ].join(' ');
}

interface Props {
  coverage: Coverage;
  title?: string;
}

/**
 * Light & Shadow map. Lit wedges are areas the user's reasoning covers;
 * dark wedges are potential blind spots. The list doubles as the accessible text alternative.
 */
export function ShadowMap({ coverage, title = 'Light & Shadow map' }: Props) {
  const lit = new Set<Area>(coverage.covered);
  return (
    <figure className="shadow-map">
      <figcaption>
        <strong>{title}</strong>
        <span className="percent">{coverage.percent}% of areas examined</span>
      </figcaption>
      <div className="map-body">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
          {AREAS.map((area, index) => (
            <path
              key={area}
              d={wedgePath(index)}
              className={lit.has(area) ? 'wedge lit' : 'wedge'}
            />
          ))}
          <text x={CENTER} y={CENTER + 6} textAnchor="middle" className="map-center">
            {coverage.covered.length}/{AREAS.length}
          </text>
        </svg>
        <ul className="area-list">
          {AREAS.map((area) => (
            <li key={area} className={lit.has(area) ? 'lit' : 'dark'}>
              <span aria-hidden="true">{lit.has(area) ? '●' : '○'}</span> {AREA_LABELS[area]}
              <span className="visually-hidden">
                {lit.has(area) ? ': examined' : ': in shadow, possible blind spot'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
