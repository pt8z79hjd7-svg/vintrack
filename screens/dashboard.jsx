// === Dashboard — wine store with 2 branches ===
const TARGETS = { revenue: 416667, margin: 25 };
const VAT = 1.18;  // כל המחזורים מוצגים כולל מע"מ — כמו ב-CashOnTab

const fmtCurrency = (v) => `₪${v.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
const fmtCompact = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`;

const Dashboard = ({ onNav, onOpen, activeBranch = 'both' }) => {
  useLiveData();   // re-render אחרי refreshData (manual/interval/realtime)
  const _cur = MONTHLY[MONTHLY.length - 1] || { total: 0, mikado: 0, kohav: 0, margin: 0 };
  const _prev = MONTHLY[MONTHLY.length - 2] || _cur;
  // לפי בורר הסניף: 'both' = total, 'mikado' / 'kohav' = רק אותו סניף
  const branchVal = (m) => activeBranch === 'both' ? m.total
                        : activeBranch === 'mikado' ? m.mikado
                        : m.kohav;
  const current = { ..._cur, total: branchVal(_cur) };
  const prev = { ..._prev, total: branchVal(_prev) };

  const revenueInclVat = Math.round(current.total * VAT);
  const targetInclVat = Math.round(TARGETS.revenue * VAT * (activeBranch === 'both' ? 1 : 0.5));
  const revenueOK = revenueInclVat >= targetInclVat;
  const marginOK = current.margin >= TARGETS.margin;

  const openOrders = ORDERS.filter(o => o.status !== 'completed').length;
  const pendingTransfers = TRANSFERS.filter(t => t.status === 'pending').length;

  // מלאי שלילי מסונן לפי סניף
  const negativeItems = PRODUCTS.filter(p => {
    if (activeBranch === 'mikado') return p.stock.mikado < 0;
    if (activeBranch === 'kohav')  return p.stock.kohav < 0;
    return p.stock.mikado < 0 || p.stock.kohav < 0;
  });
  const negativeCats = new Set(negativeItems.map(p => p.cat)).size;

  const revDelta = prev.total ? ((current.total - prev.total) / prev.total) * 100 : 0;
  const marginDelta = current.margin - prev.margin;

  const last6 = MONTHLY.slice(-6).map(m => ({
    label: m.m.split(' ')[0],
    mikado: m.mikado,
    kohav: m.kohav,
  }));

  const marginTrend = MONTHLY.slice(-6).map(m => ({
    label: m.m.split(' ')[0],
    v: m.margin,
  }));

  // ─── סיכום יומי + חודשי מעודכן (לפי בורר הסניף) ───
  const byDate = window.DAILY_BY_DATE || {};
  const datesSorted = Object.keys(byDate).sort();
  const latestDate = datesSorted[datesSorted.length - 1] || '';
  const todayISO = new Date().toISOString().slice(0, 10);
  // היום אם קיים, אחרת האחרון הזמין
  const dailyKey = byDate[todayISO] ? todayISO : latestDate;
  const dailyRaw = byDate[dailyKey] || { date: '', total: 0, mikado: 0, kohav: 0, profit: 0, margin: 0, salesLines: 0 };
  // נכון לעת ההורדה האחרונה (מתי הנתון של הסיכום היומי נכתב לאחרונה)
  const lastUpdate = window.LAST_REFRESH ? new Date(window.LAST_REFRESH) : new Date();
  const minsAgo = Math.round((Date.now() - lastUpdate.getTime()) / 60000);
  const dailyTotal = activeBranch === 'mikado' ? dailyRaw.mikado
                   : activeBranch === 'kohav'  ? dailyRaw.kohav
                   : dailyRaw.total;
  const dailyProfit = activeBranch === 'both' ? dailyRaw.profit
                    : Math.round(dailyRaw.profit * (dailyRaw.total ? dailyTotal / dailyRaw.total : 0));
  const dailyHasData = !!byDate[dailyKey];
  const dailyIsToday = dailyKey === todayISO;
  // השוואת היום מול ממוצע 7 ימים אחרונים
  const last7 = datesSorted.slice(-8, -1).map(d => byDate[d]);
  const avg7 = last7.length ? last7.reduce((a, b) => {
    const v = activeBranch === 'mikado' ? b.mikado : activeBranch === 'kohav' ? b.kohav : b.total;
    return a + v;
  }, 0) / last7.length : 0;
  const dailyVsAvg = avg7 ? ((dailyTotal - avg7) / avg7) * 100 : 0;

  // חודשי — של החודש הנוכחי
  const monthRaw = _cur;
  const monthTotal = activeBranch === 'mikado' ? monthRaw.mikado
                   : activeBranch === 'kohav'  ? monthRaw.kohav
                   : monthRaw.total;
  const monthProfit = activeBranch === 'both' ? monthRaw.profit
                    : Math.round(monthRaw.profit * (monthRaw.total ? monthTotal / monthRaw.total : 0));
  // ממוצע יומי בחודש (חלוקה לימים פעילים)
  const daysActive = monthRaw.days || 1;
  const avgPerDay = monthTotal / daysActive;
  // קצב חודשי משוער (avgPerDay × 30)
  const projectedMonth = avgPerDay * 30;

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">סקירה כללית · {_cur.m || 'מאי 2026'}
            {activeBranch !== 'both' && ` · ${activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'} בלבד`}
          </div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>בוקר טוב 👋</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            המחזור החודשי {revenueOK ? 'בקצב לעמידה ביעד' : 'מתחת ליעד'} · {openOrders} הזמנות פתוחות · {pendingTransfers} העברות ממתינות
          </div>
        </div>
        <div className="row">
          <button className="btn"><IDownload size={16} /> ייצוא דו"ח</button>
          <button className="btn btn-primary" onClick={() => onNav('orders')}>
            <IPlus size={16} /> הזמנה חדשה
          </button>
        </div>
      </div>

      {/* KPI cards (clickable) */}
      <div className="kpi-grid kpi-5">
        <button className={`kpi kpi-clickable ${revenueOK ? 'kpi-ok' : ''}`} onClick={() => onNav('monthly')}>
          <div className="kpi-label">
            <span className={`kpi-icon ${revenueOK ? 'ok' : ''}`}><ICoin size={16} /></span>
            מחזור החודש <span className="muted" style={{fontSize:11}}>(כולל מע"מ)</span>
          </div>
          <div className="kpi-value">{fmtCurrency(revenueInclVat)}</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className={`kpi-delta ${revDelta < 0 ? 'neg' : ''}`}>
              {revDelta >= 0 ? <IArrowUp size={12} /> : <IArrowDown size={12} />}
              {Math.abs(revDelta).toFixed(1)}%
            </span>
            <span className="kpi-foot">יעד {fmtCurrency(targetInclVat)}</span>
          </div>
          <div className="kpi-track">
            <div className="kpi-track-fill" style={{
              width: `${Math.min(100, (revenueInclVat / targetInclVat) * 100)}%`,
              background: revenueOK ? 'var(--ok)' : 'var(--warn)'
            }} />
          </div>
        </button>

        <button className={`kpi kpi-clickable ${marginOK ? 'kpi-ok' : ''}`} onClick={() => onNav('monthly')}>
          <div className="kpi-label">
            <span className={`kpi-icon ${marginOK ? 'ok' : 'warn'}`}><IPercent size={16} /></span>
            רווח גולמי
          </div>
          <div className="kpi-value">{current.margin.toFixed(1)}%</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className={`kpi-delta ${marginDelta < 0 ? 'neg' : ''}`}>
              {marginDelta >= 0 ? <IArrowUp size={12} /> : <IArrowDown size={12} />}
              {Math.abs(marginDelta).toFixed(1)}%
            </span>
            <span className="kpi-foot">יעד {TARGETS.margin}%</span>
          </div>
          <div className="kpi-track">
            <div className="kpi-track-fill" style={{
              width: `${Math.min(100, (current.margin / TARGETS.margin) * 100)}%`,
              background: marginOK ? 'var(--ok)' : 'var(--warn)'
            }} />
          </div>
        </button>

        <button className="kpi kpi-clickable" onClick={() => onNav('orders')}>
          <div className="kpi-label">
            <span className="kpi-icon"><ITruck size={16} /></span>
            הזמנות פתוחות
          </div>
          <div className="kpi-value">{openOrders}</div>
          <div className="kpi-foot">
            {ORDERS.filter(o => o.tone === 'warn').length} ממתינות לאישור · {ORDERS.filter(o => o.tone === 'danger').length} באיחור
          </div>
        </button>

        <button className="kpi kpi-clickable" onClick={() => onNav('transfers')}>
          <div className="kpi-label">
            <span className="kpi-icon"><ITransfer size={16} /></span>
            העברות ממתינות
          </div>
          <div className="kpi-value">{pendingTransfers}</div>
          <div className="kpi-foot">
            בין מיקדו ⇄ כוכב הצפון
          </div>
        </button>

        <button className="kpi kpi-clickable" onClick={() => onNav('inventory')}>
          <div className="kpi-label">
            <span className="kpi-icon danger"><IAlert size={16} /></span>
            מלאי שלילי
          </div>
          <div className="kpi-value">{negativeItems.length}</div>
          <div className="kpi-foot">
            ב-{negativeCats} קטגוריות · לחץ לפרטים
          </div>
        </button>
      </div>

      {/* ─── סיכום מכירות יומי + חודשי מעודכן ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card
          title={`סיכום יומי · ${dailyKey || '—'}${dailyIsToday ? ' (היום)' : ''}`}
          sub={dailyHasData
            ? `${dailyRaw.salesLines} שורות מכירה · עודכן לפני ${minsAgo < 1 ? 'רגע' : minsAgo < 60 ? minsAgo + ' דק׳' : Math.round(minsAgo/60) + ' שע׳'}${dailyIsToday ? ' · הנתון חי, גדל לאורך היום' : ''}`
            : 'אין עדיין נתונים — יורד בריצה הבאה'}
          action={
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm btn-ghost"
                      onClick={() => (window.requestFreshSync || window.refreshData)('dashboard-refresh')}
                      title="הוריד דוח טרי מ-CashOnTab ועדכן">
                ↻
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => onNav('daily')}>פירוט →</button>
            </div>
          }
        >
          <div style={{ padding: 18 }}>
            {dailyHasData ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>מחזור (כולל מע״מ)</div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCurrency(Math.round(dailyTotal * VAT))}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      ללא מע״מ: <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmtCurrency(dailyTotal)}</span>
                    </div>
                  </div>
                  {avg7 > 0 && (
                    <div style={{ textAlign: 'end' }}>
                      <div className="muted" style={{ fontSize: 11 }}>מול ממוצע 7 ימים</div>
                      <div className={`row`} style={{ gap: 4, justifyContent: 'flex-end', fontWeight: 700,
                                                       color: dailyVsAvg >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                        {dailyVsAvg >= 0 ? <IArrowUp size={14} /> : <IArrowDown size={14} />}
                        {Math.abs(dailyVsAvg).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid-2" style={{ gap: 10 }}>
                  {(activeBranch === 'both' || activeBranch === 'mikado') && (
                    <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                        <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                        <span className="muted" style={{ fontSize: 12 }}>מיקדו</span>
                      </div>
                      <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(Math.round(dailyRaw.mikado * VAT))}</div>
                    </div>
                  )}
                  {(activeBranch === 'both' || activeBranch === 'kohav') && (
                    <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                        <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                        <span className="muted" style={{ fontSize: 12 }}>כוכב הצפון</span>
                      </div>
                      <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(Math.round(dailyRaw.kohav * VAT))}</div>
                    </div>
                  )}
                </div>
                <div className="row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', justifyContent: 'space-between' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>רווח גולמי</div>
                    <div style={{ fontWeight: 700, color: 'var(--ok)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(dailyProfit)}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div className="muted" style={{ fontSize: 11 }}>מרווח</div>
                    <div style={{ fontWeight: 700 }}><span className={`badge ${dailyRaw.margin >= 25 ? 'ok' : 'warn'}`}>{Number(dailyRaw.margin || 0).toFixed(1)}%</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)', fontSize: 13 }}>
                {dailyIsToday
                  ? 'הורדת המכירות תרוץ אוטומטית בשעה הקרובה (09/12/15/18/21).'
                  : 'אין נתונים לתאריך זה.'}
              </div>
            )}
          </div>
        </Card>

        <Card
          title={`סיכום חודשי · ${monthRaw.m || ''}`}
          sub={`${daysActive} ימי פעילות · ממוצע ${fmtCurrency(Math.round(avgPerDay))}/יום`}
          action={<button className="btn btn-sm btn-ghost" onClick={() => onNav('monthly')}>פירוט →</button>}
        >
          <div style={{ padding: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>מחזור עד עכשיו (כולל מע״מ)</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCurrency(Math.round(monthTotal * VAT))}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  ללא מע״מ: <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmtCurrency(monthTotal)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div className="muted" style={{ fontSize: 11 }}>קצב חודשי משוער</div>
                <div style={{ fontWeight: 700, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCurrency(Math.round(projectedMonth * VAT))}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  ללא מע״מ: {fmtCurrency(Math.round(projectedMonth))}
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              {(activeBranch === 'both' || activeBranch === 'mikado') && (
                <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                  <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                    <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                    <span className="muted" style={{ fontSize: 12 }}>מיקדו</span>
                  </div>
                  <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(Math.round(monthRaw.mikado * VAT))}</div>
                </div>
              )}
              {(activeBranch === 'both' || activeBranch === 'kohav') && (
                <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                  <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                    <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                    <span className="muted" style={{ fontSize: 12 }}>כוכב הצפון</span>
                  </div>
                  <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(Math.round(monthRaw.kohav * VAT))}</div>
                </div>
              )}
            </div>
            <div className="row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>רווח גולמי</div>
                <div style={{ fontWeight: 700, color: 'var(--ok)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(monthProfit)}</div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div className="muted" style={{ fontSize: 11 }}>מרווח</div>
                <div style={{ fontWeight: 700 }}><span className={`badge ${monthRaw.margin >= 25 ? 'ok' : 'warn'}`}>{Number(monthRaw.margin || 0).toFixed(1)}%</span></div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
              עדכון אחרון: {latestDate || '—'}
            </div>
          </div>
        </Card>
      </div>

      {/* Bar chart + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card
          title="מחזור חודשי · 6 חודשים אחרונים"
          sub="מפוצל לפי סניף · כולל מע״מ"
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
              data={last6}
              keys={['mikado', 'kohav']}
              colors={[BRANCHES[0].color, BRANCHES[1].color]}
              fmt={(v) => fmtCompact(Math.round(v * VAT))}
            />
          </div>
        </Card>

        <Card title="חלוקת מחזור · חודש זה" sub={fmtCurrency(revenueInclVat)}>
          <div style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              <PieSplit segments={[
                { v: current.mikado, color: BRANCHES[0].color },
                { v: current.kohav,  color: BRANCHES[1].color },
              ]} />
              <div style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                textAlign: 'center', lineHeight: 1.1
              }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {((current.mikado / current.total) * 100).toFixed(0)}/{((current.kohav / current.total) * 100).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500 }}>פיצול %</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, fontSize: 12.5 }}>
              {[
                ['מיקדו', current.mikado, BRANCHES[0].color],
                ['כוכב הצפון', current.kohav, BRANCHES[1].color],
              ].map(([n, v, c]) => (
                <div key={n}>
                  <div className="between">
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: c }} />
                      <span style={{ color: 'var(--ink-2)' }}>{n}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCurrency(Math.round(v * VAT))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Margin line + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card
          title="מגמת רווח גולמי %"
          sub="6 חודשים אחרונים"
          action={<span className="badge accent">יעד: 25%</span>}
        >
          <div style={{ padding: 16 }}>
            <LineChart data={marginTrend} fmt={(v) => v.toFixed(1) + '%'} color="var(--ok)" />
          </div>
        </Card>

        <Card title="פעילות אחרונה" sub="עדכוני מערכת">
          <div className="feed">
            {ACTIVITY.map(a => (
              <div key={a.id} className="feed-item">
                <div className={`feed-dot ${a.type === 'in' ? 'ok' : a.type === 'low' ? 'danger' : ''}`}>
                  {a.type === 'in' && <IDownload size={14} />}
                  {a.type === 'low' && <IAlert size={14} />}
                  {a.type === 'xfer' && <ITransfer size={14} />}
                  {a.type === 'edit' && <IEdit size={14} />}
                </div>
                <div className="feed-text">
                  <div>{a.text}</div>
                  <div className="feed-time">{a.time} · {a.user}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* === Inventory Value Analysis === */}
      <InventoryValueSection />
    </div>
  );
};

// === Inventory value: pie (current) + stacked area (per supplier over months) ===
const SUPPLIER_COLORS = {
  esprit:    'oklch(0.55 0.13 220)',
  hakerem:   'oklch(0.62 0.14 60)',
  aviv:      'oklch(0.58 0.14 160)',
  gold:      'oklch(0.65 0.15 30)',
  tiroshlu:  'oklch(0.55 0.14 290)',
  wine_plus: 'oklch(0.52 0.10 340)',
};

const InventoryValueSection = () => {
  // hidden set lets the user toggle suppliers off
  const [hidden, setHidden] = useState(new Set());
  const toggle = (id) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHidden(next);
  };

  // Series for stacked chart
  const series = SUPPLIERS.map(s => ({
    id: s.id,
    name: s.name,
    color: SUPPLIER_COLORS[s.id] || 'var(--ink-3)',
    hidden: hidden.has(s.id),
  }));

  // Current month snapshot for pie
  const current = INVENTORY_VALUE_BY_MONTH[INVENTORY_VALUE_BY_MONTH.length - 1];
  const first = INVENTORY_VALUE_BY_MONTH[0];

  const pieSegments = SUPPLIERS
    .filter(s => !hidden.has(s.id))
    .map(s => ({
      v: current.values[s.id] || 0,
      color: SUPPLIER_COLORS[s.id] || 'var(--ink-3)',
      id: s.id,
      name: s.name,
    }));

  const totalCurrent = pieSegments.reduce((a, b) => a + b.v, 0);
  const totalFirst = SUPPLIERS
    .filter(s => !hidden.has(s.id))
    .reduce((a, s) => a + (first.values[s.id] || 0), 0);
  const totalDelta = ((totalCurrent - totalFirst) / totalFirst) * 100;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="card-title" style={{ fontSize: 16 }}>ניתוח ערך מלאי</div>
          <div className="card-sub">חלוקה לפי ספק · נוב 2025 → מאי 2026</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          לחץ על ספק בליגנדה כדי להחביא/להציג
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>
        {/* Pie chart — current snapshot */}
        <Card title="חלוקה נוכחית · מאי 2026" sub={`${fmtCurrency(totalCurrent)} סה״כ`}>
          <div style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <PieSplit segments={pieSegments} size={170} />
              <div style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                textAlign: 'center', lineHeight: 1.1, pointerEvents: 'none'
              }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {fmtCompact(totalCurrent)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500 }}>
                    ערך כולל
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUPPLIERS.map(s => {
                const v = current.values[s.id] || 0;
                const pct = ((v / totalCurrent) * 100).toFixed(1);
                const isHidden = hidden.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`legend-row ${isHidden ? 'is-hidden' : ''}`}
                  >
                    <span className="legend-swatch" style={{ background: SUPPLIER_COLORS[s.id] }} />
                    <span className="legend-name">{s.name}</span>
                    <span className="legend-value">
                      {isHidden ? '—' : fmtCurrency(v)}
                    </span>
                    <span className="legend-pct">
                      {isHidden ? '' : `${pct}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Stacked area — value over months */}
        <Card
          title="ערך מלאי לפי חודש"
          sub={`מ-${first.m} · 7 חודשים`}
          action={
            <div className="row" style={{ gap: 14, fontSize: 12 }}>
              <div style={{ textAlign: 'end' }}>
                <div className="muted" style={{ fontSize: 11 }}>שינוי מהחודש הראשון</div>
                <div className={`row`} style={{ gap: 4, justifyContent: 'flex-end', fontWeight: 700,
                                                 color: totalDelta >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                  {totalDelta >= 0 ? <IArrowUp size={12} /> : <IArrowDown size={12} />}
                  {Math.abs(totalDelta).toFixed(1)}%
                </div>
              </div>
            </div>
          }
        >
          <div style={{ padding: 16 }}>
            <StackedAreaChart
              data={INVENTORY_VALUE_BY_MONTH}
              series={series}
              fmt={(v) => fmtCompact(Math.round(v))}
              height={300}
            />
          </div>
          {/* Per-supplier monthly comparison table */}
          <div style={{ borderTop: '1px solid var(--line)', overflow: 'auto' }}>
            <table className="tbl supplier-history-tbl">
              <thead>
                <tr>
                  <th>ספק</th>
                  {INVENTORY_VALUE_BY_MONTH.map(m => (
                    <th key={m.m} style={{ textAlign: 'end' }}>{m.m.split(' ')[0]}</th>
                  ))}
                  <th style={{ textAlign: 'end' }}>שינוי</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLIERS.map(s => {
                  const firstV = first.values[s.id] || 0;
                  const lastV = current.values[s.id] || 0;
                  const delta = ((lastV - firstV) / firstV) * 100;
                  const isHidden = hidden.has(s.id);
                  return (
                    <tr key={s.id} onClick={() => toggle(s.id)}
                        style={{ opacity: isHidden ? 0.35 : 1, cursor: 'pointer' }}>
                      <td>
                        <span className="row" style={{ gap: 6 }}>
                          <span className="legend-swatch" style={{ background: SUPPLIER_COLORS[s.id] }} />
                          {s.name}
                        </span>
                      </td>
                      {INVENTORY_VALUE_BY_MONTH.map(m => (
                        <td key={m.m} style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                          {fmtCompact(m.values[s.id] || 0)}
                        </td>
                      ))}
                      <td style={{
                        textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: delta >= 0 ? 'var(--ok)' : 'var(--danger)'
                      }}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--surface)', fontWeight: 700 }}>
                  <td>סה״כ</td>
                  {INVENTORY_VALUE_BY_MONTH.map(m => {
                    const total = SUPPLIERS.reduce((a, s) => a + (m.values[s.id] || 0), 0);
                    return (
                      <td key={m.m} style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtCompact(total)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>
                    {(() => {
                      const f = SUPPLIERS.reduce((a, s) => a + (first.values[s.id] || 0), 0);
                      const c = SUPPLIERS.reduce((a, s) => a + (current.values[s.id] || 0), 0);
                      return `+${(((c - f) / f) * 100).toFixed(1)}%`;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard, fmtCurrency, fmtCompact, TARGETS });
