// === Orders / Transfers / Promotions screens ===

const STATUS_LABELS = {
  sent: 'נשלחה',
  pending: 'ממתינה לאישור',
  prep: 'בהכנה',
  late: 'באיחור',
  completed: 'הושלמה',
  'in-transit': 'בדרך',
};

const supLabel = (id) => SUPPLIERS.find(s => s.id === id)?.name || id;
const brLabel = (id) => id === 'both' ? 'שני הסניפים' : (BRANCHES.find(b => b.id === id)?.name || id);

// === Orders ===
const Orders = () => (
  <div className="page">
    <div className="between">
      <div>
        <div className="crumbs">הזמנות לספקים</div>
        <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>הזמנות פתוחות</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {ORDERS.length} הזמנות פעילות · {ORDERS.filter(o => o.tone === 'warn').length} ממתינות לאישור
        </div>
      </div>
      <button className="btn btn-primary"><IPlus size={16} /> הזמנה חדשה</button>
    </div>

    {/* Status filters */}
    <div className="chips">
      <button className="chip active">הכל ({ORDERS.length})</button>
      <button className="chip">ממתינות ({ORDERS.filter(o => o.tone === 'warn').length})</button>
      <button className="chip">בדרך ({ORDERS.filter(o => o.status === 'sent').length})</button>
      <button className="chip">באיחור ({ORDERS.filter(o => o.tone === 'danger').length})</button>
    </div>

    <Card>
      <table className="tbl">
        <thead>
          <tr>
            <th>מס׳ הזמנה</th>
            <th>ספק</th>
            <th>סניף יעד</th>
            <th>תאריך הזמנה</th>
            <th>צפי הגעה</th>
            <th>פריטים</th>
            <th style={{ textAlign: 'end' }}>סכום</th>
            <th>סטטוס</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ORDERS.map(o => (
            <tr key={o.id}>
              <td className="mono-tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.id}</td>
              <td>{supLabel(o.supplier)}</td>
              <td>
                <span className="row" style={{ gap: 6 }}>
                  {o.branch === 'both' ? (
                    <>
                      <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                      <span className="branch-dot" style={{ background: BRANCHES[1].color, marginInlineStart: -10 }} />
                    </>
                  ) : (
                    <span className="branch-dot" style={{ background: BRANCHES.find(b => b.id === o.branch)?.color }} />
                  )}
                  {brLabel(o.branch)}
                </span>
              </td>
              <td className="muted">{o.date}</td>
              <td>{o.eta}</td>
              <td>{o.items} פריטים</td>
              <td style={{ textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ₪{o.sum.toLocaleString('he-IL')}
              </td>
              <td><Badge tone={o.tone}>{STATUS_LABELS[o.status]}</Badge></td>
              <td>
                <button className="btn btn-sm btn-ghost">פרטים ←</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

// === Transfers between branches ===
const Transfers = () => (
  <div className="page">
    <div className="between">
      <div>
        <div className="crumbs">העברות בין סניפים</div>
        <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>העברות מלאי</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          מיקדו ⇄ כוכב הצפון
        </div>
      </div>
      <button className="btn btn-primary"><IPlus size={16} /> העברה חדשה</button>
    </div>

    {/* Visual flow header */}
    <Card pad>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', padding: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="branch-bubble" style={{ background: 'color-mix(in oklch, ' + BRANCHES[0].color + ' 15%, transparent)', borderColor: BRANCHES[0].color }}>
            <span style={{ color: BRANCHES[0].color, fontWeight: 700, fontSize: 18 }}>מ</span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>מיקדו</div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            יוצא: {TRANSFERS.filter(t => t.from === 'mikado' && t.status !== 'completed').reduce((s, t) => s + t.units, 0)} יח׳
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div className="row" style={{ color: 'var(--ink-3)' }}>
            <ITransfer size={28} />
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {TRANSFERS.filter(t => t.status === 'pending').length} ממתינות
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="branch-bubble" style={{ background: 'color-mix(in oklch, ' + BRANCHES[1].color + ' 15%, transparent)', borderColor: BRANCHES[1].color }}>
            <span style={{ color: BRANCHES[1].color, fontWeight: 700, fontSize: 18 }}>כ</span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>כוכב הצפון</div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            יוצא: {TRANSFERS.filter(t => t.from === 'kohav' && t.status !== 'completed').reduce((s, t) => s + t.units, 0)} יח׳
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <table className="tbl">
        <thead>
          <tr>
            <th>מס׳ העברה</th>
            <th>מ-</th>
            <th>אל-</th>
            <th>פריטים</th>
            <th>יחידות</th>
            <th>תאריך</th>
            <th>מבצע</th>
            <th>סטטוס</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {TRANSFERS.map(t => (
            <tr key={t.id}>
              <td className="mono-tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>{t.id}</td>
              <td>
                <span className="row" style={{ gap: 6 }}>
                  <span className="branch-dot" style={{ background: BRANCHES.find(b => b.id === t.from)?.color }} />
                  {BRANCHES.find(b => b.id === t.from)?.name}
                </span>
              </td>
              <td>
                <span className="row" style={{ gap: 6 }}>
                  <span className="branch-dot" style={{ background: BRANCHES.find(b => b.id === t.to)?.color }} />
                  {BRANCHES.find(b => b.id === t.to)?.name}
                </span>
              </td>
              <td>{t.items} פריטים</td>
              <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{t.units}</td>
              <td className="muted">{t.date}</td>
              <td>{t.user}</td>
              <td><Badge tone={t.tone}>{STATUS_LABELS[t.status]}</Badge></td>
              <td>
                {t.status === 'pending' && <button className="btn btn-sm btn-primary">אשר</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

// === Promotions ===
const Promotions = () => (
  <div className="page">
    <div className="between">
      <div>
        <div className="crumbs">מבצעי ספקים</div>
        <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>מבצעים פעילים</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {PROMOTIONS.length} מבצעים זמינים · התראה אוטומטית 7 ימים לפני תום מבצע
        </div>
      </div>
      <button className="btn"><IDownload size={16} /> ייצוא רשימה</button>
    </div>

    <div className="grid-3">
      {PROMOTIONS.map((p, i) => {
        const sup = SUPPLIERS.find(s => s.id === p.supplier);
        const typeBadge = {
          category: 'הנחה בקטגוריה',
          b1g1: '1+1',
          volume: 'הנחת כמות',
          payment: 'הנחת תשלום',
        }[p.type];
        return (
          <Card key={i}>
            <div className="promo-card">
              <div className="promo-discount">
                <div className="promo-discount-num">{p.discount}%</div>
                <div className="promo-discount-label">
                  {p.type === 'b1g1' ? '1+1' : 'הנחה'}
                </div>
              </div>
              <div style={{ padding: 18, flex: 1 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <Badge tone="accent">{typeBadge}</Badge>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {p.title}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sup?.name}</div>

                <div className="between" style={{ marginTop: 14, fontSize: 12 }}>
                  <div className="row" style={{ color: 'var(--ink-3)' }}>
                    <ICalendar size={13} />
                    <span>בתוקף עד {p.ends}</span>
                  </div>
                  {p.items > 0 && (
                    <span className="muted">{p.items} פריטים</span>
                  )}
                </div>

                <button className="btn btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                  הזמן עכשיו
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

Object.assign(window, { Orders, Transfers, Promotions });
