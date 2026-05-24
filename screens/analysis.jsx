// === ניתוח וחריגות — כמו סיכום הטלגרם היומי ===
const Analysis = ({ activeBranch = 'both' }) => {
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

  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const tc = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">ניתוח וחריגות</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>ניתוח וחריגות</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            כמו סיכום הטלגרם — מלאי שלילי, מלאי תקוע, ומומלצים לדחוף
            {activeBranch !== 'both' && <b> · סינון: {activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}</b>}
          </div>
        </div>
      </div>

      {/* כרטיסי סיכום */}
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">⚠️ מלאי שלילי</div><div className="kpi-value">{negative.length}</div><div className="kpi-foot">פריטים לבדיקה</div></div>
        <div className="kpi"><div className="kpi-label">📉 מלאי תקוע</div><div className="kpi-value">{dead.length}</div><div className="kpi-foot">מועמדים למבצע/החזרה</div></div>
        <div className="kpi"><div className="kpi-label">⭐ מומלץ לדחוף</div><div className="kpi-value">{push.length}</div><div className="kpi-foot">רווח גבוה + במלאי</div></div>
      </div>

      <Card title="⚠️ מלאי שלילי — לבדיקה" sub={`${negative.length} פריטים`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>מוצר</th><th>ספק</th><th style={tc}>מיקדו</th><th style={tc}>כוכב</th></tr></thead>
            <tbody>
              {negative.slice(0, 80).map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.supplier}</td>
                  <td style={{ ...tc, color: p.stock.mikado < 0 ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>{p.stock.mikado}</td>
                  <td style={{ ...tc, color: p.stock.kohav < 0 ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>{p.stock.kohav}</td>
                </tr>
              ))}
              {!negative.length && <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>אין מלאי שלילי 👍</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="📉 מלאי תקוע" sub={`${dead.length} פריטים — מלאי גבוה, מכירות נמוכות`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>מלאי</th><th style={te}>קצב/שבוע</th><th style={te}>מחיר</th></tr></thead>
            <tbody>
              {dead.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.supplier}</td>
                  <td style={te}>{stk(p)}</td>
                  <td style={te}>{(p.weekly || 0).toFixed(1)}</td>
                  <td style={te}>₪{p.price.toFixed(0)}</td>
                </tr>
              ))}
              {!dead.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>אין מלאי תקוע</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="⭐ מומלץ לדחוף" sub={`${push.length} פריטים — רווח גבוה + יש במלאי`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>מוצר</th><th>ספק</th><th style={te}>מרווח</th><th style={te}>מלאי</th><th style={te}>מחיר</th></tr></thead>
            <tbody>
              {push.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.supplier}</td>
                  <td style={te}><span className="badge ok">{(p.margin || 0).toFixed(0)}%</span></td>
                  <td style={te}>{stk(p)}</td>
                  <td style={te}>₪{p.price.toFixed(0)}</td>
                </tr>
              ))}
              {!push.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>—</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
window.Analysis = Analysis;
