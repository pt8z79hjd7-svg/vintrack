// === מכירות / מובילים — 30 המובילים ב-3 חתכים ===
const Sales = ({ activeBranch = 'both' }) => {
  const P = (window.PRODUCTS || []).filter((p) => p.total > 0 || (p.weekly || 0) > 0);
  const ppu = (p) => (p.price || 0) - (p.cost || 0);        // רווח ליחידה (לא מדויק למע"מ — אינדיקציה)
  const wprofit = (p) => (p.weekly || 0) * ppu(p);           // רווח שבועי משוער ₪

  const [view, setView] = useState('money');
  const lists = {
    margin:  [...P].sort((a, b) => (b.margin || 0) - (a.margin || 0)).slice(0, 30),
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
          <th style={te}>עלות</th><th style={te}>מחיר</th><th style={te}>מרווח</th>
          <th style={te}>קצב/שב׳</th><th style={te}>רווח/שב׳</th>
        </tr></thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={p.id}>
              <td style={{ color: 'var(--ink-3)', fontWeight: 700 }}>{i + 1}</td>
              <td style={{ fontWeight: 600 }}>{p.name}{p.is_promo && <Badge tone="accent" style={{ marginInlineStart: 6 }}>מבצע</Badge>}</td>
              <td>{p.supplier}</td>
              <td style={te}>₪{(p.cost || 0).toFixed(0)}</td>
              <td style={te}>₪{(p.price || 0).toFixed(0)}</td>
              <td style={te}><span className={`badge ${(p.margin || 0) >= 25 ? 'ok' : 'warn'}`}>{(p.margin || 0).toFixed(0)}%</span></td>
              <td style={te}>{(p.weekly || 0).toFixed(1)}</td>
              <td style={{ ...te, color: 'var(--ok)', fontWeight: 600 }}>₪{Math.round(wprofit(p))}</td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>—</td></tr>}
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
      </Card>
    </div>
  );
};
window.Sales = Sales;
