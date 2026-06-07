// === ניתוח וחריגות — מלאי שלילי, תקוע, מתחת לסף, מומלץ לדחוף ===
const Analysis = ({ activeBranch = 'both', onOpen }) => {
  useLiveData();
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

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">ניתוח וחריגות</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>ניתוח וחריגות</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            מלאי שלילי, תקוע, מתחת לסף, מומלצים לדחוף
            {activeBranch !== 'both' && <b> · {activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}</b>}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">מלאי שלילי</div><div className="kpi-value">{negative.length}</div><div className="kpi-foot">לבדיקה</div></div>
        <div className="kpi"><div className="kpi-label">מתחת לסף</div><div className="kpi-value">{belowMin.length}</div><div className="kpi-foot">יש להזמין</div></div>
        <div className="kpi"><div className="kpi-label">מלאי תקוע</div><div className="kpi-value">{dead.length}</div><div className="kpi-foot">למבצע/החזרה</div></div>
        <div className="kpi"><div className="kpi-label">מומלץ לדחוף</div><div className="kpi-value">{push.length}</div><div className="kpi-foot">רווח גבוה + במלאי</div></div>
        <div className="kpi"><div className="kpi-label">הנחות &gt;5%</div><div className="kpi-value">{discAnomalies.length}</div><div className="kpi-foot">דורש אישור</div></div>
      </div>

      {discAnomalies.length > 0 && (
        <Card title="🏷️ הנחות מעל 5% — דורש אישור" sub={`${discAnomalies.length} שורות · עובדים שנתנו הנחה גבוהה מ-5%`}>
          <div className="table-wrap">
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
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="מלאי שלילי — לבדיקה" sub={`${negative.length} פריטים`}>
        <div className="table-wrap">
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
              {!negative.length && <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>אין מלאי שלילי</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {belowMin.length > 0 && (
        <Card title="מתחת לסף מינימום — יש להזמין" sub={`${belowMin.length} פריטים מתחת ל-min_stock`}>
          <div className="table-wrap">
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
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="מלאי תקוע" sub={`${dead.length} פריטים — מלאי גבוה, מכירות נמוכות`}>
        <div className="table-wrap">
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
              {!dead.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>אין מלאי תקוע</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="מומלץ לדחוף" sub={`${push.length} פריטים — רווח גבוה + יש במלאי`}>
        <div className="table-wrap">
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
              {!push.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>—</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {promoGap.length > 0 && (
        <Card title="פערי מחיר מבצע" sub={`${promoGap.length} מוצרים נמכרים בפועל מתחת למחיר הרשמי`}>
          <div className="table-wrap">
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
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
window.Analysis = Analysis;
