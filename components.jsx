// === Shared UI helpers ===
const { useState, useEffect, useMemo, useRef } = React;

const Card = ({ title, sub, action, children, pad = false }) => (
  <div className="card">
    {(title || action) && (
      <div className="card-header">
        <div>
          {title && <div className="card-title">{title}</div>}
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {action}
      </div>
    )}
    <div className={pad ? 'card-pad' : ''}>{children}</div>
  </div>
);

const Badge = ({ tone = 'default', children }) => (
  <span className={`badge ${tone === 'default' ? '' : tone}`}>
    {tone !== 'default' && <span className="dot-status" />}
    {children}
  </span>
);

const StockBar = ({ stock, min, max }) => {
  const pct = Math.max(0, Math.min(100, (stock / max) * 100));
  const tone = stock === 0 ? 'danger' : stock < min ? 'warn' : 'ok';
  return (
    <div className="stock-bar">
      <div className="stock-bar-track">
        <div className={`stock-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ color: 'var(--ink-2)', fontWeight: 600, minWidth: 32 }}>{stock}</span>
      <span className="muted" style={{ fontSize: 11.5 }}>/ {max}</span>
    </div>
  );
};

const StockStatus = ({ stock, min }) => {
  if (stock === 0) return <Badge tone="danger">אזל</Badge>;
  if (stock < min) return <Badge tone="warn">מלאי נמוך</Badge>;
  return <Badge tone="ok">תקין</Badge>;
};

const Sparkline = ({ data, height = 220 }) => {
  const w = 720, h = height, pad = 28;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => [pad + i * stepX, h - pad - ((d.v - min) / rng) * (h - pad * 2)]);
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * t} y2={pad + (h - pad * 2) * t}
              stroke="var(--line)" strokeDasharray="3 4" />
      ))}
      <path d={areaPath} fill="url(#g1)" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => i === pts.length - 1 && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="5" fill="var(--bg-elev)" stroke="var(--accent)" strokeWidth="2.4" />
        </g>
      ))}
      {/* x labels */}
      {data.map((d, i) => i % 3 === 0 && (
        <text key={d.d} x={pad + i * stepX} y={h - 6} textAnchor="middle"
              fill="var(--ink-3)" fontSize="10" fontFamily="JetBrains Mono">
          {d.d}
        </text>
      ))}
    </svg>
  );
};

const Donut = ({ segments, size = 140 }) => {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.v, 0);
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface)" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.v / total) * c;
          const off = (acc / total) * c;
          acc += s.v;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={s.color} strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={`${len - 2} ${c}`} strokeDashoffset={-off}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        textAlign: 'center', lineHeight: 1.1
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{total}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500 }}>קטגוריות</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Card, Badge, StockBar, StockStatus, Sparkline, Donut });

// === Grouped Bar Chart (revenue by month, branch split) ===
const GroupedBarChart = ({ data, keys, colors, fmt = (v) => v, height = 240 }) => {
  const w = 720, h = height, pad = { t: 16, r: 16, b: 28, l: 50 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const groupW = innerW / data.length;
  const barW = (groupW - 12) / keys.length;
  const max = Math.max(...data.map(d => Math.max(...keys.map(k => d[k]))));
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      {/* y-axis gridlines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.t + (innerH / yTicks) * i;
        const v = max * (1 - i / yTicks);
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
                  stroke="var(--line)" strokeDasharray={i === yTicks ? '' : '3 4'} />
            <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize="10"
                  fill="var(--ink-3)" fontFamily="JetBrains Mono">
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {data.map((d, i) => (
        <g key={i}>
          {keys.map((k, j) => {
            const v = d[k];
            const barH = (v / max) * innerH;
            const x = pad.l + groupW * i + 6 + j * barW;
            const y = pad.t + innerH - barH;
            return (
              <rect key={k} x={x} y={y} width={barW - 4} height={barH}
                    rx="3" fill={colors[j]} />
            );
          })}
          <text x={pad.l + groupW * (i + 0.5)} y={h - 8} textAnchor="middle"
                fontSize="10.5" fill="var(--ink-3)" fontFamily="JetBrains Mono">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

// === Line chart for trend ===
const LineChart = ({ data, valueKey = 'v', height = 200, fmt = v => v, color = 'var(--accent)' }) => {
  const w = 720, h = height, pad = { t: 14, r: 14, b: 28, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const vals = data.map(d => d[valueKey]);
  const min = Math.min(...vals) * 0.95;
  const max = Math.max(...vals) * 1.05;
  const rng = max - min || 1;
  const stepX = innerW / (data.length - 1);
  const pts = data.map((d, i) => [pad.l + i * stepX, pad.t + innerH - ((d[valueKey] - min) / rng) * innerH]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0]} ${pad.t + innerH} L ${pts[0][0]} ${pad.t + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = pad.t + innerH * t;
        const v = max - (max - min) * t;
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
                  stroke="var(--line)" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize="10"
                  fill="var(--ink-3)" fontFamily="JetBrains Mono">
              {fmt(v)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#lg2)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4"
            strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5"
                fill="var(--bg-elev)" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pad.l + i * stepX} y={h - 8} textAnchor="middle"
              fontSize="10.5" fill="var(--ink-3)" fontFamily="JetBrains Mono">
          {d.label}
        </text>
      ))}
    </svg>
  );
};

// === Pie / split ratio ===
const PieSplit = ({ segments, size = 160 }) => {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.v, 0);
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s, i) => {
          const len = (s.v / total) * c;
          const off = (acc / total) * c;
          acc += s.v;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={s.color} strokeWidth={size / 5}
                    strokeDasharray={`${len} ${c}`} strokeDashoffset={-off}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
        })}
      </svg>
    </div>
  );
};

Object.assign(window, { GroupedBarChart, LineChart, PieSplit });

// === Stacked Area Chart (inventory value over months, per supplier) ===
const StackedAreaChart = ({ data, series, height = 280, fmt = v => v }) => {
  const w = 760, h = height, pad = { t: 16, r: 16, b: 28, l: 56 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  // Compute totals per data point (after filtering hidden series)
  const totals = data.map((d) =>
    series.reduce((s, ser) => s + (ser.hidden ? 0 : (d.values[ser.id] || 0)), 0)
  );
  const max = Math.max(1, ...totals);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  // Build stacked paths from bottom to top
  let baseLine = data.map(() => pad.t + innerH); // start at bottom

  const visibleSeries = series.filter(s => !s.hidden);
  const paths = visibleSeries.map((ser) => {
    const newLine = data.map((d, i) => {
      const v = d.values[ser.id] || 0;
      return baseLine[i] - (v / max) * innerH;
    });
    const topPts = data.map((d, i) => [pad.l + i * stepX, newLine[i]]);
    const botPts = data.map((d, i) => [pad.l + i * stepX, baseLine[i]]);
    const d_ =
      topPts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ') +
      ' ' +
      botPts.reverse().map(p => `L ${p[0]} ${p[1]}`).join(' ') +
      ' Z';
    baseLine = newLine;
    return { d: d_, color: ser.color, id: ser.id };
  });

  // Top line (for emphasis on total)
  const totalLinePath = data.map((_, i) =>
    `${i ? 'L' : 'M'} ${pad.l + i * stepX} ${baseLine[i]}`
  ).join(' ');

  // Y axis tick values
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      {/* gridlines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.t + (innerH / yTicks) * i;
        const v = max * (1 - i / yTicks);
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
                  stroke="var(--line)" strokeDasharray={i === yTicks ? '' : '3 4'} />
            <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize="10"
                  fill="var(--ink-3)" fontFamily="JetBrains Mono">
              {fmt(v)}
            </text>
          </g>
        );
      })}

      {/* stacks, drawn bottom→top */}
      {paths.map((p) => (
        <path key={p.id} d={p.d} fill={p.color} fillOpacity="0.78"
              stroke={p.color} strokeWidth="1" />
      ))}

      {/* emphasis line on total */}
      <path d={totalLinePath} fill="none" stroke="var(--ink)"
            strokeWidth="1.6" strokeOpacity="0.35" />

      {/* x labels */}
      {data.map((d, i) => (
        <text key={i} x={pad.l + i * stepX} y={h - 8} textAnchor="middle"
              fontSize="10.5" fill="var(--ink-3)" fontFamily="JetBrains Mono">
          {d.m.split(' ')[0]}
        </text>
      ))}

      {/* hover circles at top of stack (last point) */}
      {(() => {
        const lastIdx = data.length - 1;
        return (
          <circle cx={pad.l + lastIdx * stepX} cy={baseLine[lastIdx]} r="4"
                  fill="var(--bg-elev)" stroke="var(--ink)" strokeWidth="2" />
        );
      })()}
    </svg>
  );
};

Object.assign(window, { StackedAreaChart });
