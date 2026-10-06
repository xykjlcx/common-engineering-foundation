import { useId } from 'react';

export interface LineChartSeries {
  label: string;
  values: readonly number[];
}

export function LineChart({
  label,
  labels,
  series,
  emptyLabel,
}: {
  label: string;
  labels: readonly string[];
  series: readonly LineChartSeries[];
  emptyLabel: string;
}) {
  const titleId = useId();
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  const x = (index: number) => 32 + (index * 636) / Math.max(1, labels.length - 1);
  const y = (value: number) => 160 - (value / max) * 136;
  return (
    <figure data-slot="line-chart" className="min-w-0">
      {labels.length ? (
        <svg
          viewBox="0 0 700 190"
          role="img"
          aria-labelledby={titleId}
          className="h-[calc(180px*var(--app-scale))] w-full overflow-visible"
        >
          <title id={titleId}>{label}</title>
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1="32"
                x2="668"
                y1={y(max * fraction)}
                y2={y(max * fraction)}
                stroke="var(--pro-chart-grid)"
              />
              <text
                x="24"
                y={y(max * fraction) + 4}
                textAnchor="end"
                fill="var(--pro-chart-label)"
                fontSize="11"
              >
                {Number((max * fraction).toFixed(1))}
              </text>
            </g>
          ))}
          {series.map((item, seriesIndex) => (
            <g key={item.label}>
              <polyline
                points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
                fill="none"
                stroke={seriesIndex % 2 ? 'var(--pro-chart-secondary)' : 'var(--pro-chart-primary)'}
                strokeWidth="2"
                strokeDasharray={seriesIndex % 2 ? '5 4' : undefined}
              />
              {item.values.map((value, index) => (
                <circle
                  key={index}
                  cx={x(index)}
                  cy={y(value)}
                  r="3"
                  fill={seriesIndex % 2 ? 'var(--pro-chart-secondary)' : 'var(--pro-chart-primary)'}
                >
                  <title>{`${labels[index]} · ${item.label}: ${value}`}</title>
                </circle>
              ))}
            </g>
          ))}
          {[...new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1])].map((index) => (
            <text
              key={index}
              x={x(index)}
              y="184"
              textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
              fill="var(--pro-chart-label)"
              fontSize="11"
            >
              {labels[index]}
            </text>
          ))}
        </svg>
      ) : (
        <p className="py-10 text-center text-sm text-(--pro-chart-label)">{emptyLabel}</p>
      )}
      <figcaption className="flex flex-wrap gap-4 text-xs text-(--pro-chart-label)">
        {series.map((item, index) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              data-secondary={index % 2 ? true : undefined}
              className="h-0 w-4 border-t-2 border-(--pro-chart-primary) data-[secondary]:border-dashed data-[secondary]:border-(--pro-chart-secondary)"
            />
            {item.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
