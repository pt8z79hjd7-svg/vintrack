// === מכירות / מובילים — 30 המובילים ב-3 חתכים ===
const Sales = ({ activeBranch = 'both', onOpen }) => {
  useLiveData();   // re-render אחרי refreshData
  const P = (window.PRODUCTS || []).filter((p) => p.total > 0 || (p.weekly || 0) > 0);
  // מחיר אפקטיבי — "מה שנגבה בפועל".
  // סדר: ממוצע משוקלל 30 ימים (כבר מגלם מבצעים דרך analyze) → מבצע לקוחות מוגדר → מחיר רשמי.
  // אסור להעדיף את p.promo.unit_price_net: זה מחיר *מוגדר*, ולמוצרי מבצע-עלות הוא שווה
  // לעלות — אותו באג שהראה "מחיר עלות" בדוח היומי.
  //
  // שני בסיסים, בכוונה: Incl להצגה ולהשוואה מול p.price (שכולל מע"מ),
  // Net לחישוב רווח/מרווח מול p.cost (שהיא ללא מע"מ). ערבוב ביניהם ניפח מרווחים ב-~18%.
  const effPriceIncl = (p) => {
    if ((p.effective_sell_price || 0) > 0) return p.effective_sell_price;
    if (p.promo && p.promo.unit_price_net) return p.promo.unit_price_net * 1.18;
    return p.price || 0;
  };
  const effPriceNet = (p) => effPriceIncl(p) / 1.18;
  const effPrice = effPriceIncl;                              // תצוגה: כולל מע"מ, כמו "מחיר רשמי"
  const hasEff = (p) => { const ep = effPriceIncl(p); return ep > 0 && Math.abs(ep - (p.price || 0)) > 0.5; };
  const ppu = (p) => effPriceNet(p) - (p.cost || 0);          // רווח ליחידה — שני האגפים ללא מע"מ
  const effMargin = (p) => { const ep = effPriceNet(p); return ep > 0 ? ((ep - (p.cost || 0)) / ep) * 100 : 0; };
  const wprofit = (p) => (p.weekly || 0) * ppu(p);           // רווח שבועי משוער ₪

  const [view, setView] = useState('money');
  const lists = {
    margin:  [...P].sort((a, b) => effMargin(b) - effMargin(a)).slice(0, 30),
    money:   [...P].sort((a, b) => wprofit(b) - wprofit(a)).slice(0, 30),
    sellers: [...P].sort((a, b) => (b.weekly || 0) - (a.weekly || 0)).slice(0, 30),
  };
  const promos = P.filter((p) => p.is_promo).slice(0, 40);
  const rows = lists[view];

  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const tabs = [
    { id: 'money',   label: '💰 הכי מכניסים כסף' },
    { id: 'margin',  label: '📈 הכי רווחיים' },
    { id: 'sellers', label: '🔥 הכי נמכרים' },
  ];

  const Table = ({ items }) => (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr>
          <th style={{ width: 28 }}>#</th><th>מוצר</th><th>ספק</th>
          <th style={te}>עלות</th><th style={te}>מחיר רשמי</th><th style={te}>מחיר בפועל</th>
          <th style={te}>מרווח</th><th style={te}>קצב/שב׳</th><th style={te}>רווח/שב׳</th>
        </tr></thead>
        <tbody>
          {items.map((p, i) => {
            const ep = effPrice(p);
            const he = hasEff(p);
            const em = effMargin(p);
            return (
              <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
                <td style={{ color: 'var(--ink-3)', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  {p.name}
                  {p.isGeneric && <span className="badge" style={{ marginInlineStart: 6, fontSize: 10 }}>כללי</span>}
                  {p.promo && <span className="badge accent" style={{ marginInlineStart: 6, fontSize: 10 }}>🏷️ {p.promo.name}</span>}
                  {!p.promo && p.is_promo && <span className="badge accent" style={{ marginInlineStart: 6, fontSize: 10 }}>מבצע</span>}
                </td>
                <td>{p.supplier}</td>
                <td style={te}>₪{(p.cost || 0).toFixed(0)}</td>
                <td style={{ ...te, color: he ? 'var(--ink-3)' : '', textDecoration: he ? 'line-through' : 'none', fontSize: he ? 12 : 14 }}>
                  ₪{(p.price || 0).toFixed(0)}
                </td>
                <td style={{ ...te, fontWeight: he ? 700 : 400, color: he ? 'var(--accent-strong)' : '' }}>
                  {he ? `₪${ep.toFixed(0)}` : '—'}
                </td>
                <td style={te}><span className={`badge ${em >= 25 ? 'ok' : 'warn'}`}>{em.toFixed(0)}%</span></td>
                <td style={te}>{(p.weekly || 0).toFixed(1)}</td>
                <td style={{ ...te, color: 'var(--ok)', fontWeight: 600 }}>₪{Math.round(wprofit(p))}</td>
              </tr>
            );
          })}
          {!items.length && <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>—</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">מכירות</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>מוצרים מובילים</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>30 המובילים — לפי כסף, רווחיות, וכמות מכירה</div>
        </div>
      </div>

      <Card
        title="טבלת מובילים"
        sub={tabs.find((t) => t.id === view).label}
        action={
          <div className="chips">
            {tabs.map((t) => (
              <button key={t.id} className={`chip ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>{t.label}</button>
            ))}
          </div>
        }
      >
        <Table items={rows} />
      </Card>

      <Card title="🏷️ פריטים במבצע" sub={`${promos.length} פריטים מסומנים כמבצע`}>
        <Table items={promos} />
        {promos.length > 0 && (() => {
          const withEff = promos.filter(p => hasEff(p));
          const avgDiscount = withEff.length ? withEff.reduce((s, p) => s + (1 - effPrice(p) / (p.price || 1)) * 100, 0) / withEff.length : 0;
          return withEff.length > 0 ? (
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', fontSize: 13 }}>
              <span className="muted">{withEff.length} פריטים עם מחיר אפקטיבי שונה מהרשמי</span>
              <span style={{ marginInlineStart: 12, fontWeight: 600 }}>
                הנחה ממוצעת: {avgDiscount.toFixed(1)}%
              </span>
            </div>
          ) : null;
        })()}
      </Card>
    </div>
  );
};
window.Sales = Sales;
