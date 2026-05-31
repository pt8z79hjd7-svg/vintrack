// === Daily and Monthly summary screens (חיים מ-Supabase) ===
// עזרי מע"מ — מחזירים ערך נוכחי לפי SETTINGS.showInclVat (נקראים בתוך render)
const _vatM       = () => (window.vatMult     ? window.vatMult()     : 1.18);
const _vatMOpp    = () => (window.vatMultOpp  ? window.vatMultOpp()  : 1);
const _vatLbl     = () => (window.vatLabel    ? window.vatLabel()    : 'כולל מע״מ');
const _vatLblOpp  = () => (window.vatLabelOpp ? window.vatLabelOpp() : 'ללא מע״מ');

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
            {activeBranch === 'both' ? 'מחזור כולל' : (activeBranch === 'mikado' ? 'מחזור מיקדו' : 'מחזור כוכב')} ({_vatLbl()})
          </div>
          <div className="kpi-value">{fmtCurrency(Math.round(d.total * _vatM()))}</div>
          <div className="kpi-foot">
            <span style={{ color: 'var(--ink-2)' }}>{_vatLblOpp()}: ₪{Math.round(d.total * _vatMOpp()).toLocaleString('he-IL')}</span>
            <span className="muted"> · {d.salesLines} שורות</span>
          </div>
        </div>
        {(activeBranch === 'both' || activeBranch === 'mikado') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[0].color + ' 18%, transparent)', color: BRANCHES[0].color }}><IBox size={16} /></span>
              מיקדו
            </div>
            <div className="kpi-value">{fmtCurrency(Math.round(raw.mikado * _vatM()))}</div>
            <div className="kpi-foot">{pct(raw.mikado)}% מהמחזור</div>
          </div>
        )}
        {(activeBranch === 'both' || activeBranch === 'kohav') && (
          <div className="kpi">
            <div className="kpi-label">
              <span className="kpi-icon" style={{ background: 'color-mix(in oklch, ' + BRANCHES[1].color + ' 18%, transparent)', color: BRANCHES[1].color }}><IBox size={16} /></span>
              כוכב הצפון
            </div>
            <div className="kpi-value">{fmtCurrency(Math.round(raw.kohav * _vatM()))}</div>
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

  const { top_sellers = [], generic_05 = [], club_discounts = [], price_anomalies = [],
    new_products = [], promo_stats = {}, incoming_purchases = [], incoming_transfers = [],
    purchase_count = 0, transfer_count = 0,
    returns = [], returns_count = 0, returns_net_total = 0 } = det;
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
                  <th style={{ textAlign: 'end' }}>הכנסה ({_vatLbl()})</th>
                  <th style={{ textAlign: 'end' }}>מבצע</th>
                </tr>
              </thead>
              <tbody>
                {top_sellers.map((s, i) => {
                  const promo = s.barcode ? (window.PROMO_BY_BARCODE || {})[String(s.barcode)] : null;
                  const prod = s.barcode ? (window.PRODUCTS || []).find(p => p.sku === String(s.barcode)) : null;
                  const cost = prod?.cost || 0;
                  const promoNet = promo ? promo.unit_price_net : null;
                  const realProfit = promoNet && cost ? (promoNet - cost) : null;
                  const realMargin = promoNet && promoNet > 0 ? ((promoNet - cost) / promoNet * 100) : null;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--ink-3)' }}>{i + 1}</td>
                      <td>
                        {s.name}
                        {promo && <span className="badge accent" style={{ marginInlineStart: 6, fontSize: 10 }}>🏷️ {promo.name}</span>}
                      </td>
                      <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{s.qty}</td>
                      <td style={{ textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₪{s.revenue?.toLocaleString('he-IL')}</td>
                      <td style={{ textAlign: 'end', fontSize: 12 }}>
                        {promo ? (
                          <span title={`מחיר ליח׳: ₪${promo.unit_price?.toFixed(0)} | רווח: ₪${realProfit?.toFixed(0)} | מרווח: ${realMargin?.toFixed(0)}%`}>
                            <span style={{ fontWeight: 600 }}>₪{promo.unit_price?.toFixed(0)}</span>
                            {realMargin != null && <span className={`badge ${realMargin >= 25 ? 'ok' : 'warn'}`} style={{ marginInlineStart: 4 }}>{realMargin.toFixed(0)}%</span>}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 🏷️ מבצעים שזוהו + מבצעי לקוחות */}
      {(promoEntries.length > 0 || (window.PROMO_CATEGORIES || []).length > 0) && (() => {
        const promoProds = (window.PRODUCTS || []).filter(p => p.promo);
        const promoSummary = {};
        promoProds.forEach(p => {
          const k = p.promo.name;
          promoSummary[k] = (promoSummary[k] || 0) + 1;
        });
        const promoSumEntries = Object.entries(promoSummary).filter(([, v]) => v > 0);
        return (
          <Card title="🏷️ מבצעים" sub="זוהו אוטומטית מחשבוניות + מבצעי לקוחות ידניים">
            {promoEntries.length > 0 && (
              <div style={{ padding: '12px 16px 4px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>זוהו בחשבוניות:</div>
            )}
            <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {promoEntries.map(([name, count]) => (
                <div key={name} style={{
                  padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)',
                  color: 'var(--accent)', fontWeight: 600, fontSize: 13
                }}>
                  {name}: {count} פריטים
                </div>
              ))}
              {promoEntries.length === 0 && <span className="muted" style={{ fontSize: 13 }}>לא זוהו מבצעים אוטומטיים ביום זה</span>}
            </div>
            {promoSumEntries.length > 0 && (
              <>
                <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, borderTop: '1px solid var(--line)' }}>
                  מבצעי לקוחות פעילים ({promoProds.length} מוצרים):
                </div>
                <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {promoSumEntries.map(([name, count]) => (
                    <div key={name} style={{
                      padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--ok-soft, oklch(0.95 0.04 145))',
                      color: 'var(--ok)', fontWeight: 600, fontSize: 13
                    }}>
                      {name}: {count} מוצרים
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        );
      })()}

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

      {/* ↩️ חשבוניות זיכוי / החזרות */}
      {returns.length > 0 && (
        <Card title="↩️ חשבוניות זיכוי" sub={`${returns.length} חשבוניות · סכום נטו ₪${Math.round(returns_net_total).toLocaleString('he-IL')}`}>
          <div style={{ padding: 0 }}>
            {returns.map((ret, ri) => (
              <div key={ri} style={{ borderBottom: ri < returns.length - 1 ? '1px solid var(--line)' : 'none', padding: '12px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>👤 {ret.worker}</strong>
                    <span style={{ color: 'var(--ink-3)', marginInlineStart: 8 }}>{ret.branch} · {ret.time}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                color: ret.net_total < 0 ? 'var(--danger)' : 'var(--ok)' }}>
                    נטו: ₪{Math.round(ret.net_total).toLocaleString('he-IL')}
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="tbl" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 20 }}></th>
                        <th>מוצר</th>
                        <th className="mono-tiny">ברקוד</th>
                        <th style={{ textAlign: 'end' }}>כמות</th>
                        <th style={{ textAlign: 'end' }}>סה״כ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ret.items.map((it, ii) => {
                        const isReturn = it.qty < 0;
                        return (
                          <tr key={ii}>
                            <td>{isReturn ? '↩' : '+'}</td>
                            <td style={{ fontWeight: isReturn ? 600 : 400 }}>{it.name}</td>
                            <td className="mono-tiny" style={{ color: 'var(--ink-3)' }}>{it.barcode}</td>
                            <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums',
                                         color: isReturn ? 'var(--danger)' : 'inherit' }}>
                              {it.qty > 0 ? '+' : ''}{it.qty}
                            </td>
                            <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums',
                                         color: isReturn ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                              ₪{Math.round(it.total).toLocaleString('he-IL')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-3)' }}>
            ℹ️ פריטים שהוחזרו (↩) חזרו אוטומטית למלאי במחזור הבא. פריטים שניתנו בהחלפה (+) ירדו מהמלאי.
          </div>
        </Card>
      )}

      {/* 📦 כניסות סחורה (ת.מ. רכש) */}
      {incoming_purchases.length > 0 && (
        <Card title="📦 כניסות סחורה" sub={`${incoming_purchases.length} פריטים התקבלו מספקים`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>מוצר</th>
                  <th style={{ textAlign: 'end' }}>כמות</th>
                  <th>ספק</th>
                  <th style={{ textAlign: 'end' }}>עלות בדוח</th>
                  <th style={{ textAlign: 'end' }}>עלות בקובץ</th>
                  <th>סניף</th>
                </tr>
              </thead>
              <tbody>
                {incoming_purchases.map((ip, i) => {
                  const diff = ip.cost_doc && ip.cost_file ? (ip.cost_doc - ip.cost_file) : 0;
                  const hasDiff = Math.abs(diff) > 1;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{ip.name}</td>
                      <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{ip.qty}</td>
                      <td style={{ fontSize: 12 }}>{ip.supplier}</td>
                      <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {ip.cost_doc ? `₪${ip.cost_doc.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: hasDiff ? 'var(--warn)' : 'var(--ink-3)' }}>
                        {ip.cost_file ? `₪${ip.cost_file.toFixed(0)}` : '—'}
                        {hasDiff && <span style={{ fontSize: 10, marginRight: 4 }}>{diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}</span>}
                      </td>
                      <td>{ip.branch}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 🔄 העברות בין סניפים */}
      {incoming_transfers.length > 0 && (
        <Card title="🔄 העברות בין סניפים" sub={`${incoming_transfers.length} פריטים הועברו`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>מוצר</th>
                  <th style={{ textAlign: 'end' }}>כמות</th>
                  <th>מסניף</th>
                  <th>לסניף</th>
                </tr>
              </thead>
              <tbody>
                {incoming_transfers.map((it, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{it.name}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{it.qty}</td>
                    <td style={{ fontSize: 12 }}>{it.source}</td>
                    <td>{it.branch}</td>
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
        && price_anomalies.length === 0 && new_products.length === 0 && promoEntries.length === 0
        && incoming_purchases.length === 0 && incoming_transfers.length === 0 && (
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

      <Card title={`מחזור חודשי${activeBranch === 'both' ? ' לפי סניף' : (activeBranch === 'mikado' ? ' — מיקדו בלבד' : ' — כוכב הצפון בלבד')}`} sub={`${_vatLbl()} · ₪`}
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
            <GroupedBarChart data={data} keys={keys} colors={colors} fmt={(v) => fmtCompact(Math.round(v * _vatM()))} height={260} />
          ) : <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)' }}>אין נתונים בטווח.</div>}
        </div>
      </Card>

      <Card title="טבלת סיכום — כולל הכנסות חוץ-קופה" sub={`${sel.length} חודשים`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>חודש</th>
                <th style={{ textAlign: 'end' }}>מחזור חנות</th>
                <th style={{ textAlign: 'end' }}>מיקדו</th>
                <th style={{ textAlign: 'end' }}>כוכב</th>
                <th style={{ textAlign: 'end' }}>רווח גולמי</th>
                <th style={{ textAlign: 'end' }}>מרווח %</th>
                <th style={{ textAlign: 'center' }}>ימים</th>
                <th style={{ textAlign: 'end' }}>חוץ-קופה</th>
                <th style={{ textAlign: 'end' }}>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {[...sel].reverse().map((m) => {
                const finRow = (window.FINANCE?.byMonth || {})[m.month] || {};
                const ext = (Number(finRow.wolt) || 0) + (Number(finRow.tenbis) || 0) + (Number(finRow.external_sales) || 0);
                const extInclVat = Math.round(ext * _vatM());
                const total = m.total + m.extra + ext;
                const marginGood = m.margin >= 25;
                return (
                  <tr key={m.m} style={m.current ? { background: 'var(--accent-soft)' } : {}}>
                    <td style={{ fontWeight: 700 }}>{m.m}{m.current && <Badge tone="accent" style={{ marginInlineStart: 6 }}>נוכחי</Badge>}</td>
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.total * _vatM()).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.mikado * _vatM()).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.kohav * _vatM()).toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>₪{m.profit.toLocaleString('he-IL')}</td>
                    <td style={{ textAlign: 'end' }}><span className={`badge ${marginGood ? 'ok' : 'warn'}`}>{m.margin.toFixed(1)}%</span></td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.days}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: ext > 0 ? 'var(--accent-strong)' : 'var(--ink-3)' }}>
                      {ext > 0 ? `₪${extInclVat.toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>₪{Math.round(total * _vatM()).toLocaleString('he-IL')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── מחזור חנות בלבד (ללא הכנסות חיצוניות) ─── */}
      <Card title="מחזור חנות בלבד" sub="ללא הכנסות חוץ-קופה (וולט/תן-ביס/אחר) — מה שהקופה עשתה">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>חודש</th>
                <th style={{ textAlign: 'end' }}>מיקדו</th>
                <th style={{ textAlign: 'end' }}>כוכב</th>
                <th style={{ textAlign: 'end' }}>סה״כ חנות</th>
                <th style={{ textAlign: 'end' }}>רווח גולמי</th>
                <th style={{ textAlign: 'end' }}>מרווח %</th>
              </tr>
            </thead>
            <tbody>
              {[...sel].reverse().map((m) => (
                <tr key={`store-${m.m}`} style={m.current ? { background: 'var(--accent-soft)' } : {}}>
                  <td style={{ fontWeight: 700 }}>{m.m}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.mikado * _vatM()).toLocaleString('he-IL')}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.kohav * _vatM()).toLocaleString('he-IL')}</td>
                  <td style={{ textAlign: 'end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(m.total * _vatM()).toLocaleString('he-IL')}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--ok)' }}>₪{m.profit.toLocaleString('he-IL')}</td>
                  <td style={{ textAlign: 'end' }}><span className={`badge ${m.margin >= 25 ? 'ok' : 'warn'}`}>{m.margin.toFixed(1)}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── טבלת רווח והפסד (P&L) — מחזור מול רכש מול הוצאות ─── */}
      <Card title="📊 רווח והפסד (P&L)" sub="מחזור − רכש סחורה − הוצאות = שורה תחתונה">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>חודש</th>
                <th style={{ textAlign: 'end' }}>מחזור</th>
                <th style={{ textAlign: 'end' }}>רכש סחורה</th>
                <th style={{ textAlign: 'end' }}>רווח גולמי</th>
                <th style={{ textAlign: 'end' }}>חוץ-קופה</th>
                <th style={{ textAlign: 'end' }}>הוצאות</th>
                <th style={{ textAlign: 'end' }}>P&L נטו</th>
                <th style={{ textAlign: 'end' }}>% P&L</th>
              </tr>
            </thead>
            <tbody>
              {[...sel].reverse().map((m) => {
                const finRow = (window.FINANCE?.byMonth || {})[m.month] || {};
                const ext = (Number(finRow.wolt) || 0) + (Number(finRow.tenbis) || 0) + (Number(finRow.external_sales) || 0);
                const expTotal = (finRow.totalExpense || 0);
                const purch = m.purchases || 0;
                const plNet = m.total + ext - purch - expTotal;
                const plPct = m.total > 0 ? (plNet / m.total) * 100 : 0;
                const plOK = plNet >= 0;
                const numS = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
                return (
                  <tr key={`pl-${m.m}`} style={m.current ? { background: 'var(--accent-soft)' } : {}}>
                    <td style={{ fontWeight: 700 }}>{m.m}{m.current && <Badge tone="accent" style={{ marginInlineStart: 6 }}>נוכחי</Badge>}</td>
                    <td style={{ ...numS, fontWeight: 700 }}>₪{Math.round(m.total).toLocaleString('he-IL')}</td>
                    <td style={{ ...numS, color: purch > 0 ? 'var(--danger)' : 'var(--ink-3)' }}>
                      {purch > 0 ? `₪${Math.round(purch).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td style={{ ...numS, fontWeight: 600, color: 'var(--ok)' }}>₪{Math.round(m.profit).toLocaleString('he-IL')}</td>
                    <td style={{ ...numS, color: ext > 0 ? 'var(--accent-strong)' : 'var(--ink-3)' }}>
                      {ext > 0 ? `₪${Math.round(ext).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td style={{ ...numS, color: expTotal > 0 ? 'var(--danger)' : 'var(--ink-3)' }}>
                      {expTotal > 0 ? `₪${Math.round(expTotal).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td style={{ ...numS, fontWeight: 800, color: plOK ? 'var(--ok)' : 'var(--danger)' }}>
                      ₪{Math.round(plNet).toLocaleString('he-IL')}
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <span className={`badge ${plPct >= 10 ? 'ok' : plPct >= 0 ? 'warn' : 'danger'}`}>{plPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 11, padding: 14, lineHeight: 1.5 }}>
          💡 <b>P&L נטו</b> = מחזור + הכנסות חוץ-קופה − רכש סחורה (ת.מ. רכש) − הוצאות (שכר/שכירות/חשמל...).
          <br />שים לב: רכש גדול בחודש אחד עשוי להימכר לאורך מספר חודשים — זו תמונת תזרים, לא margin.
        </div>
      </Card>

      {/* ─── רווח אמיתי — לחודש הנבחר האחרון (=הנוכחי בדרך כלל) ─── */}
      {(() => {
        const cur = sel[sel.length - 1];
        if (!cur) return null;
        const finRow = (window.FINANCE?.byMonth || {})[cur.month] || {};
        const ext = (Number(finRow.wolt) || 0) + (Number(finRow.tenbis) || 0) + (Number(finRow.external_sales) || 0);
        const otherExp = (Number(finRow.rent) || 0) + (Number(finRow.electricity) || 0)
                        + (Number(finRow.water) || 0) + (Number(finRow.arnona) || 0)
                        + (Number(finRow.management) || 0) + (Number(finRow.other_expense) || 0);
        // עלות שכר — מחושבת מהשעות (אם יש), אחרת מהשדה הידני
        const payroll = (window.totalPayrollForMonth ? window.totalPayrollForMonth(cur.month) : { total: 0, withHours: 0 });
        const salaries = payroll.withHours > 0 ? payroll.total : (Number(finRow.salaries) || 0);
        const gross = cur.profit || 0;
        const net = gross + ext - otherExp - salaries;
        const margin = cur.total > 0 ? (net / cur.total) * 100 : 0;
        const netOK = net >= 0;
        const row = (label, val, color) => (
          <div className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
            <span className="muted">{label}</span>
            <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
              ₪{Math.round(val).toLocaleString('he-IL')}
            </span>
          </div>
        );
        return (
          <Card title={`💎 רווח אמיתי — ${cur.m}`} sub="כולל שכר + כל ההוצאות + הכנסות חוץ-קופה">
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '2px solid var(--line)' }}>
                <div className="muted" style={{ fontSize: 11 }}>רווח נטו</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: netOK ? 'var(--ok)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                  ₪{Math.round(net).toLocaleString('he-IL')}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {margin.toFixed(1)}% מהמחזור{payroll.withHours > 0 ? ` · שכר מחושב מ-${payroll.withHours} עובדים` : ''}
                </div>
              </div>
              {row('רווח גולמי מהקופה', gross, 'var(--ok)')}
              {ext > 0 && row('+ הכנסות חוץ-קופה (וולט/תן-ביס/אחר)', ext, 'var(--accent-strong)')}
              {otherExp > 0 && row('− הוצאות חודשיות (שכ״ד/חשמל/ארנונה…)', -otherExp, 'var(--danger)')}
              {salaries > 0 && row(`− עלות שכר${payroll.withHours > 0 ? ` (${payroll.withHours} עובדים)` : ''}`, -salaries, 'var(--danger)')}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                {row('= רווח נטו', net, netOK ? 'var(--ok)' : 'var(--danger)')}
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
};

Object.assign(window, { Daily, Monthly });
