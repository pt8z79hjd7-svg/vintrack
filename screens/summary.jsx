// === Daily and Monthly summary screens (חיים מ-Supabase) ===

// === Daily — בחירת תאריך מביאה את נתוני אותו יום ===
const Daily = ({ activeBranch = 'both', onOpen }) => {
  useLiveData();   // re-render אחרי refreshData
  const byDate = window.DAILY_BY_DATE || {};
  const dates = Object.keys(byDate).sort().reverse();
  const allDatesAsc = Object.keys(byDate).sort();
  const todayISO = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const lastAvailable = dates[0] || '';
  const isStale = lastAvailable && lastAvailable < todayISO;
  const daysBehind = lastAvailable ? Math.floor((new Date(todayISO) - new Date(lastAvailable)) / 86400000) : 0;
  const raw = byDate[date] || { date, total: 0, mikado: 0, kohav: 0, profit: 0, margin: 0, salesLines: 0, lines: [] };
  const branchTotal = activeBranch === 'mikado' ? raw.mikado
                    : activeBranch === 'kohav'  ? raw.kohav
                    : raw.total;
  const branchProfit = activeBranch === 'both' ? raw.profit
                     : Math.round(raw.profit * (raw.total ? branchTotal / raw.total : 0));
  const d = { ...raw, total: branchTotal, profit: branchProfit };
  const pct = (x) => raw.total ? ((x / raw.total) * 100).toFixed(0) : '0';
  const hasData = !!byDate[date];

  // ניווט בין תאריכים — חיצי קדימה/אחורה
  const goDay = (delta) => {
    const cur = new Date(date + 'T00:00:00');
    cur.setDate(cur.getDate() + delta);
    setDate(cur.toISOString().slice(0, 10));
  };
  const goPrevAvail = () => {
    const prev = allDatesAsc.filter(d => d < date).pop();
    if (prev) setDate(prev);
  };
  const goNextAvail = () => {
    const next = allDatesAsc.find(d => d > date);
    if (next) setDate(next);
  };
  const fmtHeb = (iso) => {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return iso; }
  };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סיכום יומי
            {date === todayISO && hasData && <span style={{ marginInlineStart: 8, color: 'var(--ok)' }}>● חי (יתעדכן בשעה הקרובה)</span>}
          </div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>
            סיכום יומי — {fmtHeb(date)}
            {date === todayISO && hasData && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ok)', marginInlineStart: 8 }}>● חי</span>}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {dates.length} ימי פעילות · השתמש בחצים לניווט
            {activeBranch !== 'both' && ` · ${activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'} בלבד`}
          </div>
        </div>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <button className="btn btn-sm btn-ghost" onClick={goPrevAvail} title="יום קודם עם נתונים"
                  style={{ padding: '6px 8px', fontSize: 16 }}>⏮</button>
          <button className="btn btn-sm btn-ghost" onClick={() => goDay(-1)} title="יום קודם"
                  style={{ padding: '6px 10px', fontSize: 16 }}>◀</button>
          <div className="date-picker" style={{ minWidth: 140, textAlign: 'center' }}>
            <ICalendar size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => goDay(1)} title="יום הבא"
                  disabled={date >= todayISO} style={{ padding: '6px 10px', fontSize: 16 }}>▶</button>
          <button className="btn btn-sm btn-ghost" onClick={goNextAvail} title="יום הבא עם נתונים"
                  disabled={date >= todayISO} style={{ padding: '6px 8px', fontSize: 16 }}>⏭</button>
          <button className="btn btn-sm" onClick={() => setDate(todayISO)} title="היום"
                  style={{ padding: '6px 12px', fontSize: 12 }}>היום</button>
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
            {activeBranch === 'both' ? 'מחזור כולל' : (activeBranch === 'mikado' ? 'מחזור מיקדו' : 'מחזור כוכב')} (כולל מע״מ)
          </div>
          <div className="kpi-value">{fmtCurrency(Math.round(d.total * 1.18))}</div>
          <div className="kpi-foot">
            <span style={{ color: 'var(--ink-2)' }}>ללא מע״מ: ₪{d.total.toLocaleString('he-IL')}</span>
            <span className="muted"> · {d.salesLines} שורות</span>
          </div>
        </div>
        {(activeBranch === 'both' || activeBranch === 'mikado') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[0].color + ' 18%, transparent)', color: BRANCHES[0].color }}><IBox size={16} /></span>
              מיקדו
            </div>
            <div className="kpi-value">{fmtCurrency(Math.round(raw.mikado * 1.18))}</div>
            <div className="kpi-foot">{pct(raw.mikado)}% מהמחזור</div>
          </div>
        )}
        {(activeBranch === 'both' || activeBranch === 'kohav') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[1].color + ' 18%, transparent)', color: BRANCHES[1].color }}><IBox size={16} /></span>
              כוכב הצפון
            </div>
            <div className="kpi-value">{fmtCurrency(Math.round(raw.kohav * 1.18))}</div>
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

      {/* ─── פרטי יום מורחבים (מ-daily_details) ─── */}
      <DailyExpanded date={date} hasData={hasData} />
    </div>
  );
};

// === DailyExpanded — מובילים, 05, הנחות, חריגות, חדשים ===
const DailyExpanded = ({ date, hasData }) => {
  const det = (window.DAILY_DETAILS || {})[date];

  if (!hasData) return null;
  if (!det) return (
    <Card title="פירוט מורחב">
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        אין עדיין פרטים מורחבים ליום זה. הם ייווצרו בריצה הבאה של הצינור.
      </div>
    </Card>
  );

  const { top_sellers = [], generic_05 = [], club_discounts = [], price_anomalies = [], new_products = [], promo_stats = {} } = det;
  const promoEntries = Object.entries(promo_stats).filter(([, v]) => v > 0);

  return (
    <>
      {/* 🏆 מובילי היום */}
      {top_sellers.length > 0 && (
        <Card title="🏆 מובילי היום" sub={`${top_sellers.length} מוצרים מובילים לפי הכנסה`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>מוצר</th>
                  <th style={{ textAlign: 'end' }}>כמות</th>
                  <th style={{ textAlign: 'end' }}>הכנסה (כולל מע"מ)</th>
                </tr>
              </thead>
              <tbody>
                {top_sellers.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--ink-3)' }}>{i + 1}</td>
                    <td>{s.name}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{s.qty}</td>
                    <td style={{ textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₪{s.revenue?.toLocaleString('he-IL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 🏷️ מבצעים שזוהו */}
      {promoEntries.length > 0 && (
        <Card title="🏷️ מבצעים שזוהו" sub="זוהו אוטומטית מחשבוניות">
          <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {promoEntries.map(([name, count]) => (
              <div key={name} style={{
                padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)',
                color: 'var(--accent)', fontWeight: 600, fontSize: 13
              }}>
                {name}: {count} פריטים
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ☕ פריטי 05 (כלליים) */}
      {generic_05.length > 0 && (
        <Card title="☕ פריטים כלליים (05)" sub={`${generic_05.length} חשבוניות עם פריט כללי בעל שם`}>
          <div style={{ padding: 14 }}>
            {generic_05.map((g, gi) => (
              <div key={gi} style={{
                marginBottom: 12, padding: 12, background: 'var(--surface)',
                borderRadius: 'var(--r-md)', border: '1px solid var(--line)'
              }}>
                <div className="row" style={{ gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                  <span>👤 {g.worker || '—'}</span>
                  <span>·</span>
                  <span>{g.branch || '—'}</span>
                  <span>·</span>
                  <span>{g.time || '—'}</span>
                </div>
                {(g.items || []).map((it, ii) => (
                  <div key={ii} className="row" style={{
                    justifyContent: 'space-between', padding: '4px 0',
                    borderTop: ii > 0 ? '1px solid var(--line)' : 'none',
                    fontWeight: it.is_generic ? 700 : 400,
                    color: it.is_generic ? 'var(--accent)' : 'var(--ink-1)'
                  }}>
                    <span>{it.is_generic ? '☕ ' : '  · '}{it.name} ×{it.qty}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ₪{it.total}
                      {it.discount > 0 && <span className="muted" style={{ fontSize: 11 }}> (-{it.discount}%)</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 🎫 הנחות מועדון */}
      {club_discounts.length > 0 && (
        <Card title="🎫 הנחות מועדון" sub={`${club_discounts.length} הנחות מעל 5%`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>מוצר</th>
                  <th style={{ textAlign: 'end' }}>הנחה</th>
                  <th style={{ textAlign: 'end' }}>מחיר</th>
                  <th>סניף</th>
                  <th>עובד</th>
                  <th>שעה</th>
                </tr>
              </thead>
              <tbody>
                {club_discounts.map((cd, i) => (
                  <tr key={i}>
                    <td>{cd.name}</td>
                    <td style={{ textAlign: 'end', color: cd.discount_pct > 20 ? 'var(--danger)' : 'var(--warn)', fontWeight: 600 }}>
                      {cd.discount_pct}%
                    </td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                      <span className="muted" style={{ textDecoration: 'line-through' }}>₪{cd.price_before}</span>
                      {' → '}₪{cd.price_after}
                    </td>
                    <td>{cd.branch}</td>
                    <td>{cd.worker}</td>
                    <td>{cd.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ⚠️ חריגות מחיר */}
      {price_anomalies.length > 0 && (
        <Card title="⚠️ חריגות מחיר" sub={`${price_anomalies.length} מוצרים נמכרו במחיר שונה מהרגיל`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>מוצר</th>
                  <th style={{ textAlign: 'end' }}>בפועל</th>
                  <th style={{ textAlign: 'end' }}>רשמי</th>
                  <th>הערה</th>
                  <th>סניף</th>
                  <th>עובד</th>
                </tr>
              </thead>
              <tbody>
                {price_anomalies.map((pa, i) => (
                  <tr key={i}>
                    <td>{pa.name}</td>
                    <td style={{ textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₪{pa.actual}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>₪{pa.official}</td>
                    <td style={{ fontSize: 12, color: 'var(--warn)' }}>{pa.note}</td>
                    <td>{pa.branch}</td>
                    <td>{pa.worker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 🆕 מוצרים חדשים */}
      {new_products.length > 0 && (
        <Card title="🆕 מוצרים חדשים" sub={`${new_products.length} מוצרים שנוספו לקובץ היום`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ברקוד</th>
                  <th>שם</th>
                  <th>ספק</th>
                </tr>
              </thead>
              <tbody>
                {new_products.map((np, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{np.barcode}</td>
                    <td>{np.name}</td>
                    <td>{np.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* אם הכל ריק */}
      {top_sellers.length === 0 && generic_05.length === 0 && club_discounts.length === 0
        && price_anomalies.length === 0 && new_products.length === 0 && promoEntries.length === 0 && (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ok)', fontSize: 14, fontWeight: 600 }}>
            ✅ אין חריגות או אירועים מיוחדים היום
          </div>
        </Card>
      )}
    </>
  );
};

// === Monthly — בחירת טווח חודשים ===
const Monthly = ({ activeBranch = 'both' }) => {
  useLiveData();   // re-render אחרי refreshData
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

      <Card title={`מחזור חודשי${activeBranch === 'both' ? ' לפי סניף' : (activeBranch === 'mikado' ? ' — מיקדו בלבד' : ' — כוכב הצפון בלבד')}`} sub="כולל מע״מ · ₪"
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
            <GroupedBarChart data={data} keys={keys} colors={colors} fmt={(v) => fmtCompact(Math.round(v * 1.18))} height={260} />
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
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.total * 1.18).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.mikado * 1.18).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.kohav * 1.18).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>₪{m.profit.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end' }}><span className={`badge ${marginGood ? 'ok' : 'warn'}`}>{m.margin.toFixed(1)}%</span></td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.days}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>₪{m.extra.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>₪{Math.round(total * 1.18).toLocaleString('he-IL')}</td>
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
