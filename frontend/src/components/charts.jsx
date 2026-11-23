import { useId } from 'react';

export function DonutChart({
  data = [],
  size = 176,
  thickness = 22,
  centerValue,
  centerLabel,
  ariaLabel,
}) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel || 'Spending breakdown'}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--chart-track)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          data.map((item) => {
            const value = Number(item.value) || 0;
            const rawLength = (value / total) * circumference;
            const length = Math.max(0, rawLength - (data.length > 1 ? 2.5 : 0));
            const dashOffset = -offset;
            offset += rawLength;
            return (
              <circle
                key={item.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
                strokeLinecap="butt"
              >
                <title>{`${item.label}: ${item.formatted || value}`}</title>
              </circle>
            );
          })}
      </svg>
      <div className="donut-chart__center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export function BarChart({
  data = [],
  height = 200,
  colors = ['var(--sage)'],
  formatValue = (value) => value,
  ariaLabel,
  showValues = false,
}) {
  const width = 600;
  const padding = { top: 18, right: 8, bottom: 30, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(
    1,
    ...data.flatMap((item) => (item.values || []).map((value) => Number(value) || 0))
  );
  const groupWidth = data.length ? innerWidth / data.length : innerWidth;
  const seriesCount = data[0]?.values?.length || 1;
  const barWidth = Math.min(34, (groupWidth * 0.58) / seriesCount);
  const gap = seriesCount > 1 ? 3 : 0;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = data.length > 9 ? 2 : 1;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={ariaLabel || 'Bar chart'}
      preserveAspectRatio="xMidYMid meet"
    >
      {gridLines.map((ratio) => {
        const y = padding.top + innerHeight - innerHeight * ratio;
        return (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="var(--chart-grid)"
            strokeWidth="1"
            strokeDasharray={ratio === 0 ? undefined : '3 5'}
          />
        );
      })}
      {data.map((item, index) => {
        const groupX = padding.left + groupWidth * index;
        const values = item.values || [];
        const totalBarWidth = values.length * barWidth + (values.length - 1) * gap;
        const startX = groupX + (groupWidth - totalBarWidth) / 2;
        const label = item.label;
        const showLabel = index % labelEvery === 0 || index === data.length - 1;

        return (
          <g key={`${label}-${index}`}>
            {values.map((value, seriesIndex) => {
              const numeric = Number(value) || 0;
              const barHeight = Math.max(numeric > 0 ? 3 : 0, (numeric / max) * innerHeight);
              const x = startX + seriesIndex * (barWidth + gap);
              const y = padding.top + innerHeight - barHeight;
              return (
                <g key={seriesIndex}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={Math.min(5, barWidth / 2)}
                    fill={colors[seriesIndex] || colors[0]}
                    opacity={0.92}
                  >
                    <title>{`${item.title || label}: ${formatValue(numeric)}`}</title>
                  </rect>
                  {showValues && numeric > 0 && values.length === 1 ? (
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      className="chart-text chart-text--value"
                    >
                      {formatValue(numeric)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {showLabel ? (
              <text
                x={groupX + groupWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="chart-text"
              >
                {label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  data = [],
  height = 210,
  color = 'var(--sage)',
  formatValue = (value) => value,
  ariaLabel,
  yMin = 0,
}) {
  const gradientId = `lineGrad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const width = 600;
  const padding = { top: 18, right: 14, bottom: 30, left: 14 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = data.map((item) => Number(item.value) || 0);
  const max = Math.max(1, ...values);
  const span = Math.max(1, max - yMin);
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const value = Number(item.value) || 0;
    return {
      ...item,
      value,
      x: padding.left + stepX * index,
      y: padding.top + innerHeight - ((value - yMin) / span) * innerHeight,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x.toFixed(2)} ${padding.top + innerHeight} L ${points[0].x.toFixed(
        2
      )} ${padding.top + innerHeight} Z`
    : '';
  const gridLines = [0, 0.5, 1];
  const labelEvery = data.length > 9 ? 2 : 1;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={ariaLabel || 'Trend chart'}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {gridLines.map((ratio) => {
        const y = padding.top + innerHeight - innerHeight * ratio;
        return (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="var(--chart-grid)"
            strokeWidth="1"
            strokeDasharray={ratio === 0 ? undefined : '3 5'}
          />
        );
      })}
      {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      {path ? (
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.4" fill="var(--surface)" stroke={color} strokeWidth="2">
            <title>{`${point.title || point.label}: ${formatValue(point.value)}`}</title>
          </circle>
          {index % labelEvery === 0 || index === points.length - 1 ? (
            <text x={point.x} y={height - 8} textAnchor="middle" className="chart-text">
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function ProgressRing({
  value = 0,
  size = 92,
  stroke = 8,
  color = 'var(--sage)',
  label,
  children,
}) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safe / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label || `${Math.round(safe)} percent complete`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--chart-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring__center">{children || <strong>{Math.round(safe)}%</strong>}</div>
    </div>
  );
}

export function ChartLegend({ items = [] }) {
  return (
    <ul className="chart-legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className="chart-legend__swatch" style={{ background: item.color }} aria-hidden="true" />
          <span className="chart-legend__label">{item.label}</span>
          {item.value ? <span className="chart-legend__value">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
