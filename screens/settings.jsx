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

      {/* פעולות תחזוקה */}
      <Card title="פעולות תחזוקה" sub="הרצה ידנית של המחזור האוטומטי">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn" onClick={() => {
            window.refreshData('manual');
            (window.toast?.info || alert)('רענון נתונים מסופאבייס...');
          }}>
            ↻ רענן נתונים מסופאבייס (לא מוריד מחדש מ-CashOnTab)
          </button>
          <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
            המחזור האוטומטי רץ כל 5 דק׳ בין 09:00-22:00 ומוריד מחדש מ-CashOnTab כשיש תנועה חדשה.
            <br />
            רענון ידני כאן מטעין רק את הנתונים מסופאבייס (מהיר, ~2 שניות).
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
