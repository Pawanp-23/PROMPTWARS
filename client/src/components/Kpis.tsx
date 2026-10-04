import type { Coverage, Finding } from '../../../shared/schema';

interface Props {
  coverage: Coverage;
  findings: Finding[];
  reflected: number;
}

/** Headline numbers for the analysis dashboard. */
export function Kpis({ coverage, findings, reflected }: Props) {
  const count = (type: Finding['type']) => findings.filter((f) => f.type === type).length;
  const tiles = [
    {
      label: 'Areas examined',
      value: `${coverage.percent}%`,
      note: `${coverage.covered.length} of 8 lit`,
    },
    { label: 'Assumptions', value: count('assumption'), note: 'unstated beliefs' },
    { label: 'Conflicts', value: count('conflict'), note: 'within your reasoning' },
    { label: 'Overlooked', value: count('overlooked'), note: 'areas in shadow' },
    { label: 'Reflected', value: `${reflected}/${findings.length}`, note: 'questions marked' },
  ];
  return (
    <dl className="kpis">
      {tiles.map((tile) => (
        <div key={tile.label} className="kpi">
          <dt className="eyebrow">{tile.label}</dt>
          <dd>
            <span className="kpi-value">{tile.value}</span>
            <span className="kpi-note">{tile.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
