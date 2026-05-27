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
const Promotions = ({ activeBranch = 'both' }) => {
  useLiveData();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards'); // cards | table

  // טופס הוספה
  const [f, setF] = useState({ title: '', supplier: '', barcode: '', deal_cost: '', regular_cost: '', sell_price: '', min_qty: '1', valid_until: '', notes: '' });
  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const promos = (window.PROMOTIONS || []).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.supplier || '').toLowerCase().includes(q) || (p.barcode || '').includes(q);
  });

  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };

  // הוספת מבצע חדש
  const addDeal = async () => {
    if (!f.title) { (window.toast?.error || alert)('חסר שם מוצר'); return; }
    setBusy('add');
    try {
      const rec = {
        title: f.title, supplier: f.supplier || 'לא ידוע', product_name: f.title,
        barcode: f.barcode || '', deal_cost: parseFloat(f.deal_cost) || null,
        regular_cost: parseFloat(f.regular_cost) || null, sell_price: parseFloat(f.sell_price) || null,
        min_quantity: parseInt(f.min_qty) || 1, valid_until: f.valid_until || null,
        notes: f.notes || '', is_active: true,
      };
      const { error } = await window.sb.from('import_deals').insert(rec);
      if (error) throw error;
      (window.toast?.success || alert)('✓ מבצע נוסף');
      setShowAdd(false);
      setF({ title: '', supplier: '', barcode: '', deal_cost: '', regular_cost: '', sell_price: '', min_qty: '1', valid_until: '', notes: '' });
      setTimeout(() => window.refreshData?.('promo-add'), 400);
    } catch (err) {
      (window.toast?.error || alert)('שגיאה: ' + err.message);
    } finally { setBusy(null); }
  };

  // מחיקת מבצע
  const deleteDeal = async (p) => {
    if (!confirm(`למחוק את "${p.title}"?`)) return;
    setBusy(p.barcode || p.title);
    try {
      // מחיקה לפי id אם יש, אחרת לפי barcode+title
      let q = window.sb.from('import_deals').delete();
      if (p.id) q = q.eq('id', p.id);
      else q = q.eq('barcode', p.barcode).eq('title', p.title);
      const { error } = await q;
      if (error) throw error;
      (window.toast?.success || alert)('✓ נמחק');
      setTimeout(() => window.refreshData?.('promo-del'), 400);
    } catch (err) {
      (window.toast?.error || alert)('שגיאה: ' + err.message);
    } finally { setBusy(null); }
  };

  const fmtCurr = (v) => v ? `₪${Number(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '---';

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">מבצעי ספקים</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>מבצעים פעילים</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {promos.length} מבצעים זמינים
            {promos.length > 0 && ` · חיסכון ממוצע ${Math.round(promos.reduce((s, p) => s + (p.discount || 0), 0) / promos.length)}%`}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className={`btn btn-sm ${view === 'cards' ? 'btn-primary' : ''}`} onClick={() => setView('cards')}>כרטיסים</button>
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : ''}`} onClick={() => setView('table')}>טבלה</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <IPlus size={16} /> {showAdd ? 'ביטול' : 'הוסף מבצע'}
          </button>
        </div>
      </div>

      {/* חיפוש */}
      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
          <ISearch size={15} />
          <input placeholder="חיפוש מוצר, ברקוד, ספק..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* טופס הוספת מבצע */}
      {showAdd && (
        <Card title="הוספת מבצע חדש" sub="הכנס ידנית או השתמש בסקריפט PDF">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, padding: '4px 0' }}>
            <div><label className="muted" style={{ fontSize: 11 }}>שם מוצר *</label>
              <input className="input" value={f.title} onChange={e => upd('title', e.target.value)} placeholder="ג'ק דניאלס דבש ליטר" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>ספק</label>
              <input className="input" value={f.supplier} onChange={e => upd('supplier', e.target.value)} placeholder="אספיריט" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>ברקוד</label>
              <input className="input" value={f.barcode} onChange={e => upd('barcode', e.target.value)} placeholder="82184000328P" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>עלות מבצע (₪)</label>
              <input className="input" type="number" value={f.deal_cost} onChange={e => upd('deal_cost', e.target.value)} placeholder="92" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>עלות רגילה (₪)</label>
              <input className="input" type="number" value={f.regular_cost} onChange={e => upd('regular_cost', e.target.value)} placeholder="110" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>מחיר מכירה (₪)</label>
              <input className="input" type="number" value={f.sell_price} onChange={e => upd('sell_price', e.target.value)} placeholder="145" /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>כמות מינימום</label>
              <input className="input" type="number" value={f.min_qty} onChange={e => upd('min_qty', e.target.value)} /></div>
            <div><label className="muted" style={{ fontSize: 11 }}>תוקף עד</label>
              <input className="input" type="date" value={f.valid_until} onChange={e => upd('valid_until', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="muted" style={{ fontSize: 11 }}>הערות</label>
            <input className="input" value={f.notes} onChange={e => upd('notes', e.target.value)} placeholder="ייבוא מקביל, גודל בקבוק..." style={{ width: '100%' }} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn btn-sm" onClick={() => setShowAdd(false)}>ביטול</button>
            <button className="btn btn-sm btn-primary" onClick={addDeal} disabled={busy === 'add'}>
              {busy === 'add' ? 'שומר…' : '✓ הוסף מבצע'}
            </button>
          </div>
        </Card>
      )}

      {/* הודעת PDF */}
      <div style={{ background: 'var(--accent-soft)', borderRadius: 8, padding: '10px 16px', marginTop: 10, fontSize: 13, color: 'var(--ink-2)' }}>
        💡 <b>טיפ:</b> להוספת מבצעים מ-PDF ספק, הנח את הקובץ בתיקייה <code>מבצעים/pdfs/</code> והרץ:
        <code style={{ display: 'block', marginTop: 4, background: 'var(--bg-1)', padding: '4px 8px', borderRadius: 4, direction: 'ltr', textAlign: 'left' }}>
          py -X utf8 אוטומציות/parse_supplier_pdf.py
        </code>
      </div>

      {/* תצוגת כרטיסים */}
      {view === 'cards' && (
        <div className="grid-3" style={{ marginTop: 12 }}>
          {promos.map((p, i) => (
            <Card key={i}>
              <div className="promo-card">
                <div className="promo-discount">
                  <div className="promo-discount-num">{p.discount || 0}%</div>
                  <div className="promo-discount-label">הנחה</div>
                </div>
                <div style={{ padding: 18, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    {p.title}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.supplier}</div>
                  {p.barcode && <div className="muted" style={{ fontSize: 11, marginTop: 2, direction: 'ltr' }}>{p.barcode}</div>}

                  <div className="row" style={{ gap: 12, marginTop: 10, fontSize: 13 }}>
                    {p.deal_cost > 0 && <div><span className="muted">מבצע: </span><b style={{ color: 'var(--accent-strong)' }}>₪{p.deal_cost}</b></div>}
                    {p.regular_cost > 0 && <div><span className="muted">רגיל: </span><span style={{ textDecoration: 'line-through', color: 'var(--ink-3)' }}>₪{p.regular_cost}</span></div>}
                  </div>

                  {p.ends && (
                    <div className="row" style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      <ICalendar size={13} />
                      <span>תוקף: {p.ends}</span>
                    </div>
                  )}

                  <div className="row" style={{ gap: 6, marginTop: 10 }}>
                    <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)' }}
                            onClick={() => deleteDeal(p)} disabled={busy === (p.barcode || p.title)}>
                      {busy === (p.barcode || p.title) ? '…' : '✕ מחק'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {promos.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
              {search ? 'אין תוצאות לחיפוש' : 'אין מבצעים פעילים'}
            </div>
          )}
        </div>
      )}

      {/* תצוגת טבלה */}
      {view === 'table' && (
        <Card title={`${promos.length} מבצעים`} sub={search ? 'מסונן' : ''}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>מוצר</th>
                  <th>ספק</th>
                  <th>ברקוד</th>
                  <th style={te}>עלות מבצע</th>
                  <th style={te}>עלות רגילה</th>
                  <th style={te}>הנחה</th>
                  <th style={te}>מחיר מכירה</th>
                  <th>תוקף</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>
                    {search ? 'אין תוצאות' : 'אין מבצעים'}
                  </td></tr>
                ) : promos.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>{p.title}</td>
                    <td style={{ fontSize: 12 }}>{p.supplier}</td>
                    <td style={{ fontSize: 11, direction: 'ltr' }}>{p.barcode || '---'}</td>
                    <td style={{ ...te, fontWeight: 700, color: 'var(--accent-strong)' }}>{fmtCurr(p.deal_cost)}</td>
                    <td style={{ ...te, color: 'var(--ink-3)', textDecoration: p.regular_cost ? 'line-through' : 'none' }}>{fmtCurr(p.regular_cost)}</td>
                    <td style={te}>{p.discount > 0 ? <span className="badge ok">{p.discount}%</span> : '---'}</td>
                    <td style={te}>{fmtCurr(p.sell_price)}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.ends || '---'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-sm" style={{ color: 'var(--danger)', fontSize: 11 }}
                              onClick={() => deleteDeal(p)} disabled={busy === (p.barcode || p.title)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

Object.assign(window, { Orders, Transfers, Promotions });
