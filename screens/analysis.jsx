// === ניתוח וחריגות — לחיצים: מלאי שלילי, תקוע, מתחת לסף, מומלץ לדחוף, הנחות, פערי-מבצע ===
// כל קטגוריה = כרטיס-לחיץ עם מונה. לחיצה פותחת רק את הרשימה שלה (טבלה אחת בכל פעם).
// אין כפילות של כותרת + רשימה — הכרטיס עצמו הוא הכניסה לרשימה.
const Analysis = ({ activeBranch = 'both', onOpen }) => {
  useLiveData();
  const [sel, setSel] = useState(null);   // הקטגוריה הפתוחה (null = הכל מכווץ)
  const P = window.PRODUCTS || [];
  const stk = (p) => activeBranch === 'mikado' ? p.stock.mikado
    : activeBranch === 'kohav' ? p.stock.kohav : p.total;
  const isNeg = (p) => activeBranch === 'mikado' ? p.stock.mikado < 0
    : activeBranch === 'kohav' ? p.stock.kohav < 0
    : (p.stock.mikado < 0 || p.stock.kohav < 0);

  const negative = P.filter(isNeg).sort((a, b) => stk(a) - stk(b));
  const dead = P.filter((p) => stk(p) >= 4 && (p.weekly || 0) < 0.25)
    .sort((a, b) => stk(b) - stk(a)).slice(0, 40);
  const push = P.filter((p) => (p.margin || 0) >= 22 && stk(p) > 0)
    .sort((a, b) => (b.margin || 0) - (a.margin || 0)).slice(0, 40);

  // מלאי מתחת ל-min_stock
  const belowMin = P.filter(p => {
    const s = stk(p); const ms = p.min_stock || 3;
    return s > 0 && s < ms;
  }).sort((a, b) => stk(a) - stk(b)).slice(0, 50);

  // מוצרים עם מחיר אפקטיבי שונה (מבצעים פעילים)
  const promoGap = P.filter(p =>
    p.effective_sell_price != null &&
    Math.abs(p.effective_sell_price - (p.price || 0)) > 1 &&
    stk(p) > 0
  ).sort((a, b) => ((b.price || 0) - (b.effective_sell_price || 0)) - ((a.price || 0) - (a.effective_sell_price || 0)))
   .slice(0, 40);

  // הנחות >5% (דורש אישור) — מצטבר מ-daily_details של כל הימים הטעונים, חדש→ישן
  const _branchHe = activeBranch === 'mikado' ? 'מיקדו' : activeBranch === 'kohav' ? 'כוכב הצפון' : null;
  const discAnomalies = (() => {
    const dd = window.DAILY_DETAILS || {};
    const out = [];
    Object.keys(dd).sort().reverse().forEach((date) => {
      (dd[date].discount_anomalies || []).forEach((x) => {
        if (_branchHe && x.branch !== _branchHe) return;
        out.push({ date, name: x.name, discount_pct: x.discount_pct, discount_amt: x.discount_amt,
          price_before: x.price_before, price_after: x.price_after, branch: x.branch, worker: x.worker, time: x.time });
      });
    });
    return out.slice(0, 100);
  })();

  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const tc = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

  // ─── הגדרת הקטגוריות (סדר = סדר הלחיצים) ───
  const SECTIONS = [
    { id: 'neg',   label: 'מלאי שלילי',      foot: 'לבדיקה',        items: negative,      danger: true },
    { id: 'below', label: 'מתחת לסף',        foot: 'יש להזמין',     items: belowMin,      warn: true },
    { id: 'dead',  label: 'מלאי תקוע',       foot: 'למבצע/החזרה',   items: dead },
    { id: 'push',  label: 'מומלץ לדחוף',     foot: 'רווח גבוה',     items: push },
    { id: 'disc',  label: 'הנחות >5%',       foot: 'דורש אישור',    items: discAnomalies, warn: true },
    { id: 'gap',   label: 'פערי מחיר מבצע',  foot: 'מתחת לרשמי',    items: promoGap },
  ];
  const cur = SECTIONS.find((s) => s.id === sel);

  const emptyRow = (cols, msg) => (
    <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>{msg}</td></tr>
  );

  // ─── גוף הטבלה לקטגוריה הפתוחה ───
  const renderBody = (id) => {
    if (id === 'neg') {
      // מעקב "נמכר בלי מלאי": כל שלילי = סחורה שנמכרה בלי תעודת רכש מוקלדת. המספרים יורדים
      // כשמקלידים בקופה את החשבוניות החסרות (גם בתאריך-אחורה — הדוחות החודשיים יורדים מחדש כל יום).
      const negUnits = (p) => Math.min(p.stock.mikado || 0, 0) + Math.min(p.stock.kohav || 0, 0);
      const units = negative.reduce((s, p) => s + negUnits(p), 0);
      const value = negative.reduce((s, p) => s + negUnits(p) * (p.cost || 0), 0);
      return (
      <>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 13, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <span><b>{negative.length}</b> מוצרים</span>
        <span><b>{Math.abs(units).toLocaleString('he-IL')}</b> יחידות נמכרו בלי מלאי רשום</span>
        <span>שווי בעלות: <b>₪{Math.abs(Math.round(value)).toLocaleString('he-IL')}</b></span>
        <span className="muted">יורד כשמקלידים בקופה את תעודות הרכש החסרות</span>
      </div>
      <table className="tbl">
        <thead><tr><th>מוצר</th><th>ספק</th><th style={tc}>מיקדו</th><th style={tc}>כוכב</th></tr></thead>
        <tbody>
          {negative.slice(0, 80).map((p) => (
            <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 600 }}>{p.name}</td>
              <td>{p.supplier}</td>
              <td style={{ ...tc, color: p.stock.mikado < 0 ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>{p.stock.mikado}</td>
              <td style={{ ...tc, color: p.stock.kohav < 0 ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>{p.stock.kohav}</td>
            </tr>
          ))}
          {!negative.length && emptyRow(4, 'אין מלאי שלילי 🎉')}
        </tbody>
      </table>
      </>
      );
    }
    if (id === 'below') return (
      <table className="tbl">
        <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>מלאי</th><th style={te}>סף</th><th style={te}>חסר</th></tr></thead>
        <tbody>
          {belowMin.map((p) => {
            const s = stk(p); const ms = p.min_stock || 3;
            return (
              <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.supplier}</td>
                <td style={{ ...te, color: 'var(--warn)', fontWeight: 700 }}>{s}</td>
                <td style={te}>{ms}</td>
                <td style={{ ...te, color: 'var(--danger)', fontWeight: 700 }}>{ms - s}</td>
              </tr>
            );
          })}
          {!belowMin.length && emptyRow(5, 'אין מוצרים מתחת לסף')}
        </tbody>
      </table>
    );
    if (id === 'dead') return (
      <table className="tbl">
        <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>מלאי</th><th style={te}>קצב/שבוע</th><th style={te}>מחיר</th></tr></thead>
        <tbody>
          {dead.map((p) => (
            <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 600 }}>{p.name}</td>
              <td>{p.supplier}</td>
              <td style={te}>{stk(p)}</td>
              <td style={te}>{(p.weekly || 0).toFixed(1)}</td>
              <td style={te}>₪{(p.price || 0).toFixed(0)}</td>
            </tr>
          ))}
          {!dead.length && emptyRow(5, 'אין מלאי תקוע')}
        </tbody>
      </table>
    );
    if (id === 'push') return (
      <table className="tbl">
        <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>מרווח</th><th style={te}>מלאי</th><th style={te}>מחיר</th></tr></thead>
        <tbody>
          {push.map((p) => (
            <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 600 }}>{p.name}{p.is_promo && <span className="badge accent" style={{ marginInlineStart: 6, fontSize: 10 }}>מבצע</span>}</td>
              <td>{p.supplier}</td>
              <td style={te}><span className="badge ok">{(p.margin || 0).toFixed(0)}%</span></td>
              <td style={te}>{stk(p)}</td>
              <td style={te}>₪{(p.price || 0).toFixed(0)}</td>
            </tr>
          ))}
          {!push.length && emptyRow(5, '—')}
        </tbody>
      </table>
    );
    if (id === 'disc') return (
      <table className="tbl">
        <thead><tr><th>תאריך</th><th>מוצר</th><th style={te}>הנחה</th><th style={te}>₪ הנחה</th><th style={te}>מחיר</th><th>סניף</th><th>עובד</th></tr></thead>
        <tbody>
          {discAnomalies.map((da, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: 'nowrap' }}>{da.date}</td>
              <td>{da.name}</td>
              <td style={{ ...te, color: da.discount_pct > 20 ? 'var(--danger)' : 'var(--warn)', fontWeight: 600 }}>{da.discount_pct}%</td>
              <td style={{ ...te, fontWeight: 600 }}>₪{da.discount_amt}</td>
              <td style={te}><span className="muted" style={{ textDecoration: 'line-through' }}>₪{da.price_before}</span>{' → '}₪{da.price_after}</td>
              <td>{da.branch}</td>
              <td>{da.worker}</td>
            </tr>
          ))}
          {!discAnomalies.length && emptyRow(7, 'אין הנחות חריגות')}
        </tbody>
      </table>
    );
    if (id === 'gap') return (
      <table className="tbl">
        <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>רשמי</th><th style={te}>בפועל</th><th style={te}>הפרש</th></tr></thead>
        <tbody>
          {promoGap.map((p) => {
            const diff = (p.price || 0) - (p.effective_sell_price || 0);
            return (
              <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 600 }}>{p.name}<span className="badge accent" style={{ marginInlineStart: 6, fontSize: 10 }}>במבצע</span></td>
                <td>{p.supplier}</td>
                <td style={te}>₪{(p.price || 0).toFixed(0)}</td>
                <td style={{ ...te, fontWeight: 700, color: 'var(--accent-strong)' }}>₪{(p.effective_sell_price || 0).toFixed(0)}</td>
                <td style={{ ...te, color: 'var(--danger)' }}>-₪{diff.toFixed(0)}</td>
              </tr>
            );
          })}
          {!promoGap.length && emptyRow(5, 'אין פערי מחיר')}
        </tbody>
      </table>
    );
    return null;
  };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">ניתוח וחריגות</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>ניתוח וחריגות</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            לחץ על כרטיס כדי לפתוח את הרשימה שלו
            {activeBranch !== 'both' && <b> · {activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}</b>}
          </div>
        </div>
      </div>

      {/* ─── לחיצים: כל קטגוריה כרטיס עם מונה. לחיצה פותחת/סוגרת את הרשימה ─── */}
      <div className="kpi-grid">
        {SECTIONS.map((s) => {
          const active = sel === s.id;
          const hot = s.items.length > 0 && (s.danger || s.warn);
          return (
            <button
              key={s.id}
              className="kpi kpi-clickable"
              onClick={() => setSel(active ? null : s.id)}
              aria-expanded={active}
              style={active ? {
                borderColor: 'var(--accent)',
                background: 'var(--accent-soft)',
                boxShadow: '0 0 0 1px var(--accent)',
              } : {}}
            >
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={hot ? { color: s.danger ? 'var(--danger)' : 'var(--warn)' } : {}}>
                {s.items.length}
              </div>
              <div className="kpi-foot">{active ? '▲ לחץ לסגירה' : `${s.foot} ›`}</div>
            </button>
          );
        })}
      </div>

      {/* ─── הרשימה של הקטגוריה הפתוחה בלבד ─── */}
      {cur ? (
        <Card title={cur.label} sub={`${cur.items.length} פריטים`}>
          <div className="table-wrap">{renderBody(cur.id)}</div>
        </Card>
      ) : (
        <div className="muted" style={{ textAlign: 'center', padding: '38px 20px', fontSize: 14 }}>
          👆 בחר קטגוריה למעלה כדי לראות את הפירוט
        </div>
      )}
    </div>
  );
};
window.Analysis = Analysis;
