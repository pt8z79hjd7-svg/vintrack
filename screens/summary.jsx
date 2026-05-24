// === Daily and Monthly summary screens ===

// === Daily ===
const Daily = () => {
  const [date, setDate] = useState('2026-05-23');
  const d = DAILY_SAMPLE;

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סיכום יומי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>סיכום יומי</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            בחר תאריך לצפייה במחזור, רווח ושורות מכירה
          </div>
        </div>
        <div className="row">
          <div className="date-picker">
            <ICalendar size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn"><IDownload size={16} /> ייצוא יום</button>
        </div>
      </div>

      {/* Totals */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">
            <span className="kpi-icon"><ICoin size={16} /></span>
            מחזור כולל (ללא מע״מ)
          </div>
          <div className="kpi-value">{fmtCurrency(d.total)}</div>
          <div className="kpi-foot">{d.lines.length} שורות מכירה</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[0].color + ' 18%, transparent)', color: BRANCHES[0].color }}>
              <IBox size={16} />
            </span>
            מיקדו
          </div>
          <div className="kpi-value">{fmtCurrency(d.mikado)}</div>
          <div className="kpi-foot">
            {((d.mikado / d.total) * 100).toFixed(0)}% מהמחזור היומי
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[1].color + ' 18%, transparent)', color: BRANCHES[1].color }}>
              <IBox size={16} />
            </span>
            כוכב הצפון
          </div>
          <div className="kpi-value">{fmtCurrency(d.kohav)}</div>
          <div className="kpi-foot">
            {((d.kohav / d.total) * 100).toFixed(0)}% מהמחזור היומי
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="kpi-icon ok"><IPercent size={16} /></span>
            רווח גולמי
          </div>
          <div className="kpi-value">{fmtCurrency(d.profit)}</div>
          <div className="kpi-foot" style={{ color: 'var(--ok)', fontWeight: 600 }}>
            מרווח {d.margin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Sale lines */}
      <Card title="שורות מכירה" sub={`${d.lines.length} שורות · ${d.date}`}
            action={
              <div className="chips">
                <button className="chip active">הכל</button>
                <button className="chip">מיקדו</button>
                <button className="chip">כוכב</button>
              </div>
            }>
        <table className="tbl">
          <thead>
            <tr>
              <th>שעה</th>
              <th>סניף</th>
              <th>ברקוד</th>
              <th>מוצר</th>
              <th style={{ textAlign: 'center' }}>כמות</th>
              <th style={{ textAlign: 'end' }}>מחזור</th>
              <th style={{ textAlign: 'end' }}>רווח</th>
              <th style={{ textAlign: 'end' }}>מרווח</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => {
              const b = BRANCHES.find(x => x.id === l.branch);
              const margin = (l.profit / l.sum) * 100;
              return (
                <tr key={i}>
                  <td className="mono-tiny" style={{ color: 'var(--ink)' }}>{l.time}</td>
                  <td>
                    <span className="row" style={{ gap: 6 }}>
                      <span className="branch-dot" style={{ background: b.color }} />
                      {b.name}
                    </span>
                  </td>
                  <td className="mono-tiny">{l.sku}</td>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{l.qty}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                    ₪{l.sum.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ok)', fontWeight: 600 }}>
                    ₪{l.profit.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                    {margin.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface)' }}>
              <td colSpan="4" style={{ fontWeight: 700, padding: '14px 18px' }}>סה״כ</td>
              <td style={{ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {d.lines.reduce((s, l) => s + l.qty, 0)}
              </td>
              <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                ₪{d.lines.reduce((s, l) => s + l.sum, 0).toFixed(2)}
              </td>
              <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ok)' }}>
                ₪{d.lines.reduce((s, l) => s + l.profit, 0).toFixed(2)}
              </td>
              <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {(d.lines.reduce((s, l) => s + l.profit, 0) / d.lines.reduce((s, l) => s + l.sum, 0) * 100).toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
};

// === Monthly ===
const Monthly = () => {
  const data = MONTHLY.map(m => ({
    label: m.m.split(' ')[0],
    mikado: m.mikado,
    kohav: m.kohav,
  }));

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סיכום חודשי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>השוואה חודשית</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {MONTHLY.length} חודשים · מנובמבר 2025 עד {MONTHLY[MONTHLY.length - 1].m}
          </div>
        </div>
        <div className="row">
          <button className="btn"><IDownload size={16} /> ייצוא דו"ח</button>
        </div>
      </div>

      <Card
        title="מחזור חודשי לפי סניף"
        sub="ללא מע״מ · ₪"
        action={
          <div className="row" style={{ gap: 14, fontSize: 12 }}>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: BRANCHES[0].color }} />
              מיקדו
            </span>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: BRANCHES[1].color }} />
              כוכב הצפון
            </span>
          </div>
        }
      >
        <div style={{ padding: 16 }}>
          <GroupedBarChart
            data={data}
            keys={['mikado', 'kohav']}
            colors={[BRANCHES[0].color, BRANCHES[1].color]}
            fmt={(v) => fmtCompact(Math.round(v))}
            height={260}
          />
        </div>
      </Card>

      <Card title="טבלת סיכום" sub="כל החודשים">
        <table className="tbl">
          <thead>
            <tr>
              <th>חודש</th>
              <th style={{ textAlign: 'end' }}>מחזור</th>
              <th style={{ textAlign: 'end' }}>מיקדו</th>
              <th style={{ textAlign: 'end' }}>כוכב</th>
              <th style={{ textAlign: 'end' }}>רווח גולמי</th>
              <th style={{ textAlign: 'end' }}>מרווח %</th>
              <th style={{ textAlign: 'center' }}>ימים</th>
              <th style={{ textAlign: 'end' }}>הכנסות נוספות</th>
              <th style={{ textAlign: 'end' }}>סה״כ הכנסות</th>
            </tr>
          </thead>
          <tbody>
            {[...MONTHLY].reverse().map(m => {
              const total = m.total + m.extra;
              const marginGood = m.margin >= 25;
              return (
                <tr key={m.m} style={m.current ? { background: 'var(--accent-soft)' } : {}}>
                  <td style={{ fontWeight: 700 }}>
                    {m.m}
                    {m.current && <Badge tone="accent" style={{ marginInlineStart: 6 }}>נוכחי</Badge>}
                  </td>
                  <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ₪{m.total.toLocaleString('he-IL')}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                    ₪{m.mikado.toLocaleString('he-IL')}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                    ₪{m.kohav.toLocaleString('he-IL')}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    ₪{m.profit.toLocaleString('he-IL')}
                  </td>
                  <td style={{ textAlign: 'end' }}>
                    <span className={`badge ${marginGood ? 'ok' : 'warn'}`}>
                      {m.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.days}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>
                    ₪{m.extra.toLocaleString('he-IL')}
                  </td>
                  <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>
                    ₪{total.toLocaleString('he-IL')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

Object.assign(window, { Daily, Monthly });
