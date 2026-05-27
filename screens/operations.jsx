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
const Transfers = ({ activeBranch = 'both' }) => {
  const [showModal, setShowModal] = useState(false);
  useLiveData();

  // הצעות חכמות: מוצרים שבסניף אחד יש עודף ובשני 0 או שלילי
  const suggestions = React.useMemo(() => {
    return PRODUCTS
      .filter(p => {
        const m = p.stock.mikado, k = p.stock.kohav;
        return (m > 5 && k <= 0) || (k > 5 && m <= 0);
      })
      .map(p => {
        const fromBranch = p.stock.mikado > p.stock.kohav ? 'mikado' : 'kohav';
        const fromStock = fromBranch === 'mikado' ? p.stock.mikado : p.stock.kohav;
        const suggestedQty = Math.floor(fromStock / 2);
        return { ...p, fromBranch, suggestedQty };
      })
      .sort((a, b) => b.suggestedQty - a.suggestedQty)
      .slice(0, 8);
  }, []);

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">העברות בין סניפים</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>העברות מלאי</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            מיקדו ⇄ כוכב הצפון
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><IPlus size={16} /> העברה חדשה</button>
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

      {/* הצעות חכמות */}
      {suggestions.length > 0 && (
        <Card title="💡 הצעות להעברה" sub="מוצרים שבסניף אחד יש עודף ובשני חסר">
          <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((s, i) => (
              <button key={i} className="btn btn-sm" onClick={() => setShowModal({ product: s, from: s.fromBranch, qty: s.suggestedQty })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span className="branch-dot" style={{ background: BRANCHES[s.fromBranch === 'mikado' ? 0 : 1].color }} />
                {s.name?.slice(0, 25)} — {s.suggestedQty} יח׳
                <ITransfer size={12} />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <table className="tbl">
          <thead>
            <tr>
              <th>מוצר</th>
              <th>מ-</th>
              <th>אל-</th>
              <th>יחידות</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {TRANSFERS.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name || t.id}</td>
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
                <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{t.units}</td>
                <td><Badge tone={t.tone}>{STATUS_LABELS[t.status]}</Badge></td>
                <td>
                  {t.status === 'pending' && <button className="btn btn-sm btn-primary">אשר</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Transfer modal */}
      {showModal && <TransferModal initial={typeof showModal === 'object' ? showModal : null} onClose={() => setShowModal(false)} />}
    </div>
  );
};

// === Transfer modal — יצירת העברה חדשה ===
const TransferModal = ({ initial, onClose }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(initial?.product || null);
  const [from, setFrom] = useState(initial?.from || 'mikado');
  const [qty, setQty] = useState(initial?.qty || 1);
  const [busy, setBusy] = useState(false);

  const filtered = React.useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return PRODUCTS.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.includes(q))
      .slice(0, 15);
  }, [search]);

  const to = from === 'mikado' ? 'kohav' : 'mikado';
  const fromStock = selected ? (from === 'mikado' ? selected.stock.mikado : selected.stock.kohav) : 0;
  const toStock = selected ? (to === 'mikado' ? selected.stock.mikado : selected.stock.kohav) : 0;

  const doTransfer = async () => {
    if (!selected || qty < 1) return;
    setBusy(true);
    try {
      const fromLabel = from === 'mikado' ? 'מיקדו' : 'כוכב הצפון';
      const toLabel = to === 'mikado' ? 'מיקדו' : 'כוכב הצפון';
      // INSERT לטבלת transfers
      const { error: e1 } = await window.sb.from('transfers').insert({
        product_id: selected.sku, product_name: selected.name,
        from_branch: fromLabel, to_branch: toLabel,
        quantity: qty, status: 'ממתין'
      });
      if (e1) throw e1;
      // UPDATE stock atomically
      const stockFrom = from === 'mikado' ? 'stock_mikado' : 'stock_kochav';
      const stockTo = to === 'mikado' ? 'stock_mikado' : 'stock_kochav';
      const { error: e2 } = await window.sb.rpc('transfer_stock', {
        p_barcode: selected.sku, p_from_field: stockFrom, p_to_field: stockTo, p_qty: qty
      });
      // fallback אם ה-RPC לא קיים — עדכון ישיר (פחות בטוח אבל עובד)
      if (e2) {
        console.warn('RPC transfer_stock not found, using direct update:', e2.message);
        await window.sb.from('products')
          .update({ [stockFrom]: fromStock - qty, [stockTo]: toStock + qty })
          .eq('barcode', selected.sku);
      }
      (window.toast?.success || alert)('✓ העברה נרשמה');
      setTimeout(() => window.refreshData && window.refreshData('transfer'), 500);
      onClose();
    } catch (e) {
      (window.toast?.error || alert)('שגיאה: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-header">
          <div className="modal-title">העברה בין סניפים</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* בחירת מוצר */}
          {!selected ? (
            <div>
              <label className="muted" style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>חפש מוצר</label>
              <input className="input" placeholder="שם מוצר או ברקוד..." value={search}
                     onChange={(e) => setSearch(e.target.value)} autoFocus style={{ width: '100%' }} />
              {filtered.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                  {filtered.map(p => (
                    <button key={p.id} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 0, borderBottom: '1px solid var(--line)' }}
                            onClick={() => { setSelected(p); setSearch(''); }}>
                      <span>{p.name?.slice(0, 35)}</span>
                      <span className="muted" style={{ fontSize: 11 }}>מ:{p.stock.mikado} כ:{p.stock.kohav}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{selected.name?.slice(0, 35)}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>שנה ←</button>
              </div>
              <div className="row" style={{ gap: 16, fontSize: 13 }}>
                <span>מיקדו: <b>{selected.stock.mikado}</b></span>
                <span>כוכב: <b>{selected.stock.kohav}</b></span>
                <span className="muted">ברקוד: {selected.sku}</span>
              </div>
            </div>
          )}

          {/* כיוון + כמות */}
          {selected && (
            <>
              <div>
                <label className="muted" style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>כיוון ההעברה</label>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <button className={`btn ${from === 'mikado' ? 'btn-primary' : ''}`}
                          onClick={() => setFrom('mikado')} style={{ flex: 1 }}>
                    <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                    מיקדו ({selected.stock.mikado})
                  </button>
                  <span style={{ fontSize: 18 }}>→</span>
                  <button className={`btn ${from === 'kohav' ? 'btn-primary' : ''}`}
                          onClick={() => setFrom('kohav')} style={{ flex: 1 }}>
                    <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                    כוכב ({selected.stock.kohav})
                  </button>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                  לחץ על הסניף ה<b>שולח</b> · {from === 'mikado' ? 'מיקדו → כוכב' : 'כוכב → מיקדו'}
                </div>
              </div>

              <div>
                <label className="muted" style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>כמות להעברה</label>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>−</button>
                  <input className="input" type="number" min="1" max={fromStock} value={qty}
                         onChange={(e) => setQty(Math.max(1, Math.min(fromStock, +e.target.value || 1)))}
                         style={{ width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '6px' }} />
                  <button className="btn btn-sm" onClick={() => setQty(Math.min(fromStock, qty + 1))} disabled={qty >= fromStock}>+</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setQty(Math.floor(fromStock / 2))}>חצי</button>
                </div>
                {qty > fromStock && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ כמות גדולה מהמלאי ({fromStock})</div>}
              </div>

              {/* סיכום */}
              <div style={{ padding: 12, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', fontSize: 13 }}>
                <b>{qty}</b> יח׳ של <b>{selected.name?.slice(0, 30)}</b>
                <br />מ-<b>{from === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}</b> ({fromStock} → {fromStock - qty})
                → <b>{to === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}</b> ({toStock} → {toStock + qty})
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" disabled={!selected || qty < 1 || qty > fromStock || busy}
                  onClick={doTransfer}>
            {busy ? 'מעביר…' : `✓ העבר ${qty} יח׳`}
          </button>
        </div>
      </div>
    </div>
  );
};

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
