// === 💀 מלאי מת — מחירי חיסול + עמלות מכירה לעובדים ===
// מקור הנתונים: products.last_sale_date (מוזן מהצינור: last_sale_dates.json).
// כל המחירים בתצוגה כולל מע"מ; מרווח מחושב תמיד על נטו (÷1.18) מול עלות נטו.

// ─── מדרגות זמן: הנחה מומלצת + עמלת עובד ─────────────────────────────────
// עמלה = אחוז ממחיר המכירה בפועל (כולל מע"מ), עם תקרה: לא יותר מ-40% מהרווח
// הגולמי של הבקבוק במחיר המבצע — כך החנות תמיד שומרת לפחות 60% מהרווח.
// לשינוי המדרגות: ערכו כאן בלבד.
const DS_TIERS = [
  { id: 'slow',   label: '🟡 מאט',  min: 60,  max: 89,       disc: 0.15, comm: 0.04 },
  { id: 'dead',   label: '🔴 מת',   min: 90,  max: 179,      disc: 0.25, comm: 0.07 },
  { id: 'frozen', label: '💀 קפוא', min: 180, max: Infinity, disc: 0.35, comm: 0.10 },
];
const DS_VAT = 1.18;
const DS_COMM_PROFIT_CAP = 0.40;   // תקרת עמלה כחלק מהרווח הגולמי לבקבוק

const dsTier = (days) => {
  if (days == null) return DS_TIERS[2];               // "מעולם" = קפוא
  return DS_TIERS.find(t => days >= t.min && days <= t.max) || null;
};

// מחיר חיסול: הנחה לפי מדרגה, לעולם לא מתחת לרצפה (עלות×1.18 = איזון כולל מע"מ)
const dsPromoPrice = (cost, price, tier) => {
  const floor = cost * DS_VAT;
  if (!price || price <= 0) return { promo: floor, floor };
  return { promo: Math.max(price * (1 - tier.disc), floor), floor };
};

// עמלת עובד לבקבוק (₪, כולל התקרה)
const dsCommission = (promo, cost, tier) => {
  const profit = promo / DS_VAT - cost;               // רווח גולמי נטו לבקבוק
  if (profit <= 0) return 0;
  return Math.min(promo * tier.comm, profit * DS_COMM_PROFIT_CAP);
};

const DeadStock = ({ activeBranch = 'both', onOpen }) => {
  useLiveData();
  const P = window.PRODUCTS || [];
  const [tierFilter, setTierFilter] = useState('all');

  const stk = (p) => activeBranch === 'mikado' ? p.stock.mikado
    : activeBranch === 'kohav' ? p.stock.kohav : p.total;

  const hasDates = P.some(p => p.last_sale_date != null);

  // מחיר כוזב = עלות×1.18 בדיוק → אין מחיר מדף אמיתי; צריך תמחור, לא הנחה
  const isFakePrice = (p) => p.cost > 0 && p.price > 0 && Math.abs(p.price - p.cost * DS_VAT) < 0.05;

  const rows = P
    .filter(p => stk(p) > 0 && (p.cost || 0) > 0 && !p.isGeneric)
    .map(p => {
      const days = p.days_since_sale;
      const tier = dsTier(days);
      if (!tier || (days != null && days < 60)) return null;
      const fake = isFakePrice(p);
      const { promo, floor } = dsPromoPrice(p.cost, p.price, tier);
      const comm = fake ? 0 : dsCommission(promo, p.cost, tier);
      const netPromo = promo / DS_VAT;
      const marginPromo = netPromo > 0 ? ((netPromo - p.cost) / netPromo) * 100 : 0;
      return {
        p, days, tier, fake,
        promo, floor, comm, marginPromo,
        locked: stk(p) * p.cost,
        commTotal: comm * stk(p),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.locked - a.locked);

  const shown = tierFilter === 'all' ? rows : rows.filter(r => r.tier.id === tierFilter);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const fmt0 = (v) => '₪' + Math.round(v).toLocaleString('he-IL');

  const tierCount = (id) => rows.filter(r => r.tier.id === id).length;

  return (
    <div>
      {!hasDates && (
        <Card title="⚠️ אין עדיין נתוני תאריך-מכירה">
          <div style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7 }}>
            עמודת <code>last_sale_date</code> טרם קיימת ב-Supabase. יש להריץ ב-SQL Editor:
            <pre style={{ background: 'var(--bg-2)', padding: '8px 12px', borderRadius: 8, direction: 'ltr', textAlign: 'left', overflowX: 'auto' }}>
              ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_sale_date date;
            </pre>
            ואז "סנכרן עכשיו". עד אז מוצגים רק מוצרים ללא תאריך (כ"💀 קפוא").
          </div>
        </Card>
      )}

      {/* KPI */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
        {DS_TIERS.map(t => (
          <div key={t.id} className="kpi-card" style={{ padding: '12px 14px', cursor: 'pointer', outline: tierFilter === t.id ? '2px solid var(--accent)' : 'none', borderRadius: 'var(--r-md)', background: 'var(--card)' }}
               onClick={() => setTierFilter(tierFilter === t.id ? 'all' : t.id)}>
            <div className="muted" style={{ fontSize: 11 }}>{t.label} ({t.min}{t.max === Infinity ? '+' : '–' + t.max} יום)</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{tierCount(t.id)}</div>
            <div className="muted" style={{ fontSize: 10 }}>הנחה {Math.round(t.disc * 100)}% · עמלה {Math.round(t.comm * 100)}%</div>
          </div>
        ))}
        <div className="kpi-card" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--card)' }}>
          <div className="muted" style={{ fontSize: 11 }}>💰 הון כלוא (עלות)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt0(sum(rows, r => r.locked))}</div>
          <div className="muted" style={{ fontSize: 10 }}>{rows.length} מוצרים</div>
        </div>
        <div className="kpi-card" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--card)' }}>
          <div className="muted" style={{ fontSize: 11 }}>🎯 עמלות אם הכל יימכר</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ok)' }}>{fmt0(sum(rows, r => r.commTotal))}</div>
          <div className="muted" style={{ fontSize: 10 }}>עד {Math.round(DS_COMM_PROFIT_CAP * 100)}% מהרווח לבקבוק</div>
        </div>
      </div>

      <Card
        title="💀 מלאי מת — מחירון חיסול ועמלות"
        sub={`${shown.length} מוצרים · עמלה משולמת על מכירה במחיר המבצע · מחיר רצפה = עלות + מע"מ`}
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>
              <th>מוצר</th><th>ספק</th>
              <th style={{ textAlign: 'end' }}>מלאי{activeBranch === 'both' ? ' (מ׳/כ׳)' : ''}</th>
              <th style={{ textAlign: 'end' }}>ימים</th>
              <th>דרגה</th>
              <th style={{ textAlign: 'end' }}>עלות</th>
              <th style={{ textAlign: 'end' }}>מחיר מדף</th>
              <th style={{ textAlign: 'end' }}>💰 מחיר מבצע</th>
              <th style={{ textAlign: 'end' }}>מרווח במבצע</th>
              <th style={{ textAlign: 'end' }}>🧑‍💼 עמלה/בקבוק</th>
              <th style={{ textAlign: 'end' }}>הון כלוא</th>
            </tr></thead>
            <tbody>
              {shown.map(({ p, days, tier, fake, promo, floor, comm, marginPromo, locked }) => (
                <tr key={p.id} onClick={() => onOpen?.('detail', p)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
                  <td style={{ fontWeight: 600 }}>{p.name}
                    {fake && <span className="badge warn" style={{ marginInlineStart: 6, fontSize: 10 }} title="מחיר המדף = עלות+מע&quot;מ בדיוק — אין מחיר אמיתי. לתמחר לפני שמוכרים.">⚠️ חסר תמחור</span>}
                  </td>
                  <td>{p.supplier}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                    {activeBranch === 'both' ? `${p.stock.mikado}/${p.stock.kohav}` : stk(p)}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{days == null ? 'מעולם' : days}</td>
                  <td>{tier.label}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{p.cost.toFixed(0)}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{(p.price || 0).toFixed(0)}</td>
                  <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}
                      title={`רצפה: ₪${floor.toFixed(0)} — מתחת לזה מפסידים`}>
                    {fake ? '—' : '₪' + promo.toFixed(0)}
                  </td>
                  <td style={{ textAlign: 'end' }}>
                    {fake ? <span className="badge warn">לתמחר</span>
                          : <span className={`badge ${marginPromo >= 15 ? 'ok' : 'warn'}`}>{marginPromo.toFixed(0)}%</span>}
                  </td>
                  <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--ok)', fontVariantNumeric: 'tabular-nums' }}>
                    {comm > 0 ? '₪' + comm.toFixed(1) : '—'}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{fmt0(locked)}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={11} className="muted" style={{ textAlign: 'center', padding: 20 }}>אין מוצרים בדרגה זו 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
