// === Settings — הגדרות גלובליות + min_stock להמלצות הזמנה ===
const Settings = ({ activeBranch = 'both' }) => {
  useLiveData();
  const [defaultMin, setDefaultMin] = useState(3);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ total: 0, withCustom: 0, defaultCount: 0 });

  // טען סטטיסטיקה של מינימום נוכחי
  React.useEffect(() => {
    const P = window.PRODUCTS || [];
    const withCustom = P.filter(p => p.min_stock != null && p.min_stock !== 3).length;
    setStats({ total: P.length, withCustom, defaultCount: P.length - withCustom });
  }, []);

  // החל מינימום גלובלי על כל המוצרים שאין להם override
  const applyDefaultMin = async () => {
    if (!window.confirm(`לעדכן min_stock = ${defaultMin} לכל ${stats.total} המוצרים?`)) return;
    setBusy(true);
    try {
      const { error } = await window.sb.from('products')
        .update({ min_stock: Math.max(0, Number(defaultMin) || 0) })
        .neq('barcode', null);
      if (error) throw error;
      (window.toast?.success || alert)('✓ מינימום עודכן לכל המוצרים');
      setTimeout(() => window.refreshData && window.refreshData('settings'), 500);
    } catch (e) {
      (window.toast?.error || alert)('שגיאה: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // ספירת מוצרים מתחת לסף נוכחי
  const lowStockNow = React.useMemo(() => {
    const P = window.PRODUCTS || [];
    return P.filter(p => {
      const stock = activeBranch === 'mikado' ? p.stock.mikado
                  : activeBranch === 'kohav' ? p.stock.kohav
                  : p.stock.mikado + p.stock.kohav;
      return stock > 0 && stock < (p.min_stock ?? 3);
    }).length;
  }, [activeBranch]);

  // ─── מבצעי לקוחות ───
  const promoCats = window.PROMO_CATEGORIES || [];
  const promoUsage = React.useMemo(() => {
    const m = {}; const map = window.PROMO_BY_BARCODE || {};
    Object.values(map).forEach(pr => { if (pr.id) m[pr.id] = (m[pr.id] || 0) + 1; });
    return m;
  }, [promoCats.length, window.LAST_REFRESH]);
  const [pName, setPName] = useState('');
  const [pUnits, setPUnits] = useState('');
  const [pTotal, setPTotal] = useState('');
  const [pBusy, setPBusy] = useState(false);

  const addPromoCat = async () => {
    const units = Number(pUnits) || 0, total = Number(pTotal) || 0;
    const name = pName.trim() || (units && total ? `${units} ב-${total}` : '');
    if (!units || !total || !name) { (window.toast?.warn || alert)('מלא שם, כמות יחידות ומחיר כולל'); return; }
    setPBusy(true);
    const { error } = await window.sb.from('promo_categories').insert({ name, units, price_total: total });
    setPBusy(false);
    if (error) { (window.toast?.error || alert)('יצירה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('✓ מבצע נוצר');
    setPName(''); setPUnits(''); setPTotal('');
    setTimeout(() => window.refreshData && window.refreshData('promo-cat-add'), 400);
  };

  const deletePromoCat = async (id, name, used) => {
    if (used > 0) { (window.toast?.warn || alert)(`לא ניתן למחוק — ${used} מוצרים משויכים ל"${name}". הסר אותם קודם.`); return; }
    if (!window.confirm(`למחוק את סוג המבצע "${name}"?`)) return;
    setPBusy(true);
    const { error } = await window.sb.from('promo_categories').delete().eq('id', id);
    setPBusy(false);
    if (error) { (window.toast?.error || alert)('מחיקה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('המבצע נמחק');
    setTimeout(() => window.refreshData && window.refreshData('promo-cat-del'), 400);
  };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">הגדרות מערכת</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>הגדרות</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            מינימום מלאי גלובלי, התראות, ופרמטרים שמשפיעים על המלצות הזמנה
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon"><IBox size={16} /></span>סה״כ מוצרים</div>
          <div className="kpi-value">{stats.total.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">פעילים במערכת</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon"><ISettings size={16} /></span>מוצרים עם min_stock מותאם</div>
          <div className="kpi-value">{stats.withCustom.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">{stats.defaultCount.toLocaleString('he-IL')} עם ברירת מחדל</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon danger"><IAlert size={16} /></span>מתחת לסף עכשיו</div>
          <div className="kpi-value">{lowStockNow.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">{activeBranch === 'both' ? 'שני הסניפים' : (activeBranch === 'mikado' ? 'מיקדו' : 'כוכב')}</div>
        </div>
      </div>

      {/* מינימום מלאי גלובלי */}
      <Card
        title="מינימום מלאי גלובלי"
        sub="קובע את הסף להתראת 'יש להזמין' לכל מוצר שאין לו ערך מותאם אישית"
      >
        <div style={{ padding: 18 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="muted" style={{ fontSize: 13 }}>מינימום ברירת מחדל (יחידות):</label>
            <input className="input" type="number" min="0" step="1" value={defaultMin}
                   onChange={(e) => setDefaultMin(+e.target.value)}
                   style={{ width: 100, fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '6px 10px' }} />
            <button className="btn btn-primary" onClick={applyDefaultMin} disabled={busy}>
              {busy ? 'מחיל…' : 'החל על כל המוצרים'}
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            ⚠ פעולה זו תדרוס את ה-min_stock של <b>כל המוצרים</b> ({stats.total.toLocaleString('he-IL')}).
            <br />
            כדי לקבוע מינימום למוצר ספציפי: כרטיסיית המוצר → ערוך → שדה "מינימום מלאי להתראה".
          </div>
        </div>
      </Card>

      {/* ניהול מבצעי לקוחות */}
      <Card title="🏷️ מבצעי לקוחות" sub="סוגי מבצעי מכירה (3 ב-100, 3 ב-120…) — לשיוך למוצרים בכרטיס המוצר">
        <div style={{ padding: 18 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>
                <th>מבצע</th>
                <th style={{ textAlign: 'end' }}>יחידות</th>
                <th style={{ textAlign: 'end' }}>מחיר כולל</th>
                <th style={{ textAlign: 'end' }}>ליחידה</th>
                <th style={{ textAlign: 'end' }}>משויכים</th>
                <th></th>
              </tr></thead>
              <tbody>
                {promoCats.map(c => {
                  const used = promoUsage[c.id] || 0;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ textAlign: 'end' }}>{c.units}</td>
                      <td style={{ textAlign: 'end' }}>₪{c.price_total}</td>
                      <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--accent-strong)' }}>₪{c.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: 'end' }}>{used || '—'}</td>
                      <td style={{ textAlign: 'end' }}>
                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                                onClick={() => deletePromoCat(c.id, c.name, used)} disabled={pBusy}>מחק</button>
                      </td>
                    </tr>
                  );
                })}
                {!promoCats.length && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>אין מבצעים — הוסף למטה</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>שם</div>
              <input className="input" value={pName} placeholder="3 ב-120"
                     onChange={e => setPName(e.target.value)} style={{ width: 110, padding: '6px 8px' }} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>כמות יח׳</div>
              <input className="input" type="number" value={pUnits} placeholder="3"
                     onChange={e => setPUnits(e.target.value)} style={{ width: 70, padding: '6px 8px' }} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>מחיר כולל ₪</div>
              <input className="input" type="number" value={pTotal} placeholder="120"
                     onChange={e => setPTotal(e.target.value)} style={{ width: 90, padding: '6px 8px' }} />
            </div>
            <button className="btn btn-primary" onClick={addPromoCat} disabled={pBusy}>{pBusy ? '…' : '+ הוסף מבצע'}</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            כדי לשייך יין למבצע: כרטיסיית המוצר → קטע "🏷️ מבצע לקוחות" → בחר מבצע → שמור.
            <br />המחיר ליחידה והרווח האמיתי מחושבים אוטומטית ומופיעים במכירות ובניתוח.
          </div>
        </div>
      </Card>

      {/* פעולות תחזוקה */}
      <Card title="פעולות תחזוקה" sub="הורדה / רענון מיידיים">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => {
            if (window.requestFreshSync) window.requestFreshSync('settings-fresh');
            else window.refreshData('manual');
          }}>
            📥 הורד דוח טרי מ-CashOnTab ועדכן (30-60 שניות)
          </button>
          <button className="btn" onClick={() => {
            window.refreshData('settings-soft');
            (window.toast?.info || alert)('רענון נתונים מסופאבייס...');
          }}>
            ↻ רענן מסופאבייס בלבד (מהיר, ~2 שניות — בלי הורדה חדשה)
          </button>
          <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
            <b>"הורד דוח טרי"</b> = שולח בקשה למחשב, שמריץ את המחזור: הורדה מ-CashOnTab → ניתוח → דחיפה לסופאבייס → רענון.
            <br />
            <b>"רענן מסופאבייס"</b> = רק מטעין את מה שכבר שמור בסופאבייס (בלי הורדה חדשה).
          </div>
        </div>
      </Card>

      {/* מידע מערכת */}
      <Card title="פרטי מערכת" sub="לשימוש בעתיד / לתמיכה">
        <div style={{ padding: 18, fontSize: 13 }}>
          <table className="tbl" style={{ width: '100%' }}>
            <tbody>
              <tr><td className="muted">URL</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{window.location.href}</td></tr>
              <tr><td className="muted">Supabase Project</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>clfctpetgnydfwyjsbuo</td></tr>
              <tr><td className="muted">תזמון אוטומטי</td><td>כל 5 דק׳ · 09:00 – 22:00 (Windows Task Scheduler)</td></tr>
              <tr><td className="muted">עדכון אחרון של נתונים</td><td>{window.LAST_REFRESH ? new Date(window.LAST_REFRESH).toLocaleString('he-IL') : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
window.Settings = Settings;
