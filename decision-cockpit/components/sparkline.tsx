import { monthlySeries } from '@/lib/forecast-tree';
import type { ReportRow } from '@/lib/parse';

export function Sparkline({ row }: { row: ReportRow }) {
  const deltas = monthlySeries(row);
  const max = Math.max(...deltas, 1);
  const w = 96;
  const h = 24;
  const barW = w / deltas.length - 2;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {deltas.map((v, i) => {
        const barH = Math.max((v / max) * h, 1);
        const x = i * (w / deltas.length);
        const y = h - barH;
        return <rect key={i} x={x} y={y} width={barW} height={barH} rx={1} className="fill-primary/70" />;
      })}
    </svg>
  );
}
