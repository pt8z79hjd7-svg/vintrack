// === Daily and Monthly summary screens (חיים מ-Supabase) ===

// === Daily — בחירת תאריך מביאה את נתוני אותו יום ===
const Daily = ({ activeBranch = 'both' }) => {
  const byDate = window.DAILY_BY_DATE || {};
  const dates = Object.keys(byDate).sort().reverse();
  const todayISO = new Date().toISOString().slice(0, 10);
  // ברירת מחדל: היום (גם אם אין נתונים — נראה הודעה).
  // אם היום עוד לא ירד — נתחיל מהיום, המשתמש יוכל לרדת ידנית לאחור.
  const [date, setDate] = useState(todayISO);
  const lastAvailable = dates[0] || '';
  const isStale = lastAvailable && lastAvailable < todayISO;
  const daysBehind = lastAvailable ? Math.floor((new Date(todayISO) - new Date(lastAvailable)) / 86400000) : 0;
  const raw = byDate[date] || { date, total: 0, mikado: 0, kohav: 0, profit: 0, margin: 0, salesLines: 0, lines: [] };
  // לפי בורר הסניף: 'both' = total, אחרת רק הסניף הנבחר
  const branchTotal = activeBranch === 'mikado' ? raw.mikado
                    : activeBranch === 'kohav'  ? raw.kohav
                    : raw.total;
  const branchProfit = activeBranch === 'both' ? raw.profit
                     : Math.round(raw.profit * (raw.total ? branchTotal / raw.total : 0));
  const d = { ...raw, total: branchTotal, profit: branchProfit };
  const pct = (x) => raw.total ? ((x / raw.total) * 100).toFixed(0) : '0';
  const hasData = !!byDate[date];

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סיכום יומי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>סיכום יומי</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            בחר תאריך — הנתונים נטענים מ-{dates.length} ימי פעילות
            {activeBranch !== 'both' && ` · ${activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'} בלבד`}
          </div>
        </div>
        <div className="row">
          <div className="date-picker">
            <ICalendar size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {isStale && (
        <Card>
          <div style={{ padding: 14, background: 'var(--warn-soft)', borderRadius: 'var(--r-md)',
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>נתונים לא עדכניים.</strong> הקובץ האחרון שעובד הוא {lastAvailable} ({daysBehind} ימים אחורה).
              <br />
              <span className="muted">המחזור הבא של הורדת מסמכים מ-CashOnTab יקרה בשעה הקרובה (תזמון: 09/12/15/18/21).</span>
            </div>
            <button className="btn btn-sm" onClick={() => setDate(lastAvailable)}>קפוץ ליום עם נתונים</button>
          </div>
        </Card>
      )}
      {!hasData && date && (
        <Card>
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>
            {date === todayISO
              ? 'אין עדיין נתונים להיום (הורדת המסמכים תרוץ אוטומטית בשעה הקרובה).'
              : 'אין נתונים לתאריך זה (יום סגור / טרם נקלט). נסה תאריך אחר.'}
          </div>
        </Card>
      )}

      {/* Totals */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon"><ICoin size={16} /></span>
            {activeBranch === 'both' ? 'מחזור כולל' : (activeBranch === 'mikado' ? 'מחזור מיקדו' : 'מחזור כוכב')} (ללא מע״מ)
          </div>
          <div className="kpi-value">{fmtCurrency(d.total)}</div>
          <div className="kpi-foot">
            <span style={{ color: 'var(--ink-2)' }}>כולל מע״מ: ₪{Math.round(d.total * 1.18).toLocaleString('he-IL')}</span>
            <span className="muted"> · {d.salesLines} שורות</span>
          </div>
        </div>
        {(activeBranch === 'both' || activeBranch === 'mikado') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[0].color + ' 18%, transparent)', color: BRANCHES[0].color }}><IBox size={16} /></span>
              מיקדו
            </div>
            <div className="kpi-value">{fmtCurrency(raw.mikado)}</div>
            <div className="kpi-foot">{pct(raw.mikado)}% מהמחזור</div>
          </div>
        )}
        {(activeBranch === 'both' || activeBranch === 'kohav') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[1].color + ' 18%, transparent)', color: BRANCHES[1].color }}><IBox size={16} /></span>
              כוכב הצפון
            </div>
            <div className="kpi-value">{fmtCurrency(raw.kohav)}</div>
            <div className="kpi-foot">{pct(raw.kohav)}% מהמחזור</div>
          </div>
        )}
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon ok"><IPercent size={16} /></span>
            רווח גולמי{activeBranch !== 'both' && ' (מחושב יחסית)'}
          </div>
          <div className="kpi-value">{fmtCurrency(d.profit)}</div>
          <div className="kpi-foot" style={{ color: 'var(--ok)', fontWeight: 600 }}>מרווח {Number(d.margin).toFixed(1)}%</div>
        </div>
      </div>

      <Card title="פירוט מכירות" sub={`${d.salesLines} שורות · ${d.date || ''}`}>
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5, lineHeight: 1.8 }}>
          סיכום היום מוצג למעלה (מחזור, סניפים, רווח, מרווח).<br />
          פירוט שורה-אחר-שורה יתווסף בשלב הבא (דחיפת יומן המכירות ל-Supabase).
        </div>
      </Card>
    </div>
  );
};

// === Monthly — בחירת טווח חודשים ===
const Monthly = ({ activeBranch = 'both' }) => {
  const all = window.MONTHLY || [];
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(Math.max(0, all.length - 1));
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const sel = all.slice(lo, hi + 1);
  // לפי בורר הסניף — הגרף מציג את העמודה הרלוונטית בלבד
  const keys = activeBranch === 'mikado' ? ['mikado']
             : activeBranch === 'kohav'  ? ['kohav']
             : ['mikado', 'kohav'];
  const colors = activeBranch === 'mikado' ? [BRANCHES[0].color]
               : activeBranch === 'kohav'  ? [BRANCHES[1].color]
               : [BRANCHES[0].color, BRANCHES[1].color];
  const data = sel.map((m) => ({ label: m.m.split(' ')[0], mikado: m.mikado, kohav: m.kohav }));

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סיכום חודשי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>השוואה חודשית</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {all.length} חודשים זמינים · בחר טווח להצגה
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="date-picker">
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>מ-</span>
            <select className="select" value={from} onChange={(e) => setFrom(+e.target.value)} style={{ border: 0, background: 'transparent' }}>
              {all.map((m, i) => <option key={i} value={i}>{m.m}</option>)}
            </select>
          </div>
          <div className="date-picker">
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>עד</span>
            <select className="select" value={to} onChange={(e) => setTo(+e.target.value)} style={{ border: 0, background: 'transparent' }}>
              {all.map((m, i) => <option key={i} value={i}>{m.m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Card title={`מחזור חודשי${activeBranch === 'both' ? ' לפי סניף' : (activeBranch === 'mikado' ? ' — מיקדו בלבד' : ' — כוכב הצפון בלבד')}`} sub="ללא מע״מ · ₪"
        action={
          <div className="row" style={{ gap: 14, fontSize: 12 }}>
            {(activeBranch === 'both' || activeBranch === 'mikado') && (
              <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BRANCHES[0].color }} />מיקדו</span>
            )}
            {(activeBranch === 'both' || activeBranch === 'kohav') && (
              <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BRANCHES[1].color }} />כוכב הצפון</span>
            )}
          </div>
        }>
        <div style={{ padding: 16 }}>
          {data.length ? (
            <GroupedBarChart data={data} keys={keys} colors={colors} fmt={(v) => fmtCompact(Math.round(v))} height={260} />
          ) : <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)' }}>אין נתונים בטווח.</div>}
        </div>
      </Card>

      <Card title="טבלת סיכום" sub={`${sel.length} חודשים`}>
        <div className="table-wrap">
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
                <th style={{ textAlign: 'end' }}>נוספות</th>
                <th style={{ textAlign: 'end' }}>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {[...sel].reverse().map((m) => {
                const total = m.total + m.extra;
                const marginGood = m.margin >= 25;
                return (
                  <tr key={m.m} style={m.current ? { background: 'var(--accent-soft)' } : {}}>
                    <td style={{ fontWeight: 700 }}>{m.m}{m.current && <Badge tone="accent" style={{ marginInlineStart: 6 }}>נוכחי</Badge>}</td>
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{m.total.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{m.mikado.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{m.kohav.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>₪{m.profit.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end' }}><span className={`badge ${marginGood ? 'ok' : 'warn'}`}>{m.margin.toFixed(1)}%</span></td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.days}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>₪{m.extra.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>₪{total.toLocaleString('he-IL')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { Daily, Monthly });
