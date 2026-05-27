// === New Products — products missing prices + recently added ===
// מוצר נשאר בטאב הזה עד שהמשתמש מאשר אותו (ממלא מחירים + לוחץ ✓ אשר).
// אישור = is_active נשאר true + יש עלות + יש מחיר מכירה. ללא שניהם — לא ניתן לאשר.
const NewProducts = ({ onOpen, activeBranch = 'both' }) => {
  useLiveData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created');
  const [editing, setEditing] = useState(null);   // barcode being inline-edited
  const [editCost, setEditCost] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [busy, setBusy] = useState(null);          // barcode currently saving

  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // classify: מוצר "ממתין" = חסר עלות או מחיר או חדש ב-7 ימים ולא אושר
  const classified = PRODUCTS.map(p => {
    const missingCost = !p.cost || p.cost <= 0;
    const missingPrice = !p.price || p.price <= 0;
    const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
    const isNew = createdMs > now - WEEK_MS;
    // "דורש תשומת לב" = חסר מחיר/עלות, או חדש ועדיין לא מלא
    const needsAttention = missingCost || missingPrice;
    const isRecentNew = isNew && !missingCost && !missingPrice;
    return { ...p, missingCost, missingPrice, isNew, createdMs, needsAttention, isRecentNew };
  });

  // filter
  let items = classified.filter(p => p.needsAttention || p.isRecentNew);
  if (filter === 'missing_cost') items = items.filter(p => p.missingCost);
  if (filter === 'missing_price') items = items.filter(p => p.missingPrice);
  if (filter === 'new') items = items.filter(p => p.isNew);
  if (filter === 'ready') items = items.filter(p => !p.missingCost && !p.missingPrice);

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.includes(q) || p.supplier.toLowerCase().includes(q));
  }

  items.sort((a, b) => {
    if (sort === 'created') return b.createdMs - a.createdMs;
    if (sort === 'name') return a.name.localeCompare(b.name, 'he');
    if (sort === 'supplier') return a.supplier.localeCompare(b.supplier, 'he');
    return 0;
  });

  const countAll = classified.filter(p => p.needsAttention || p.isRecentNew).length;
  const countMissingCost = classified.filter(p => p.missingCost).length;
  const countMissingPrice = classified.filter(p => p.missingPrice).length;
  const countNew = classified.filter(p => p.isNew).length;
  const countReady = classified.filter(p => p.isRecentNew).length;

  const fmtDate = (iso) => {
    if (!iso) return '---';
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const fmtCurrency = (v) => v ? `₪${v.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '---';
  const stockVal = (p) => {
    if (activeBranch === 'mikado') return p.stock.mikado;
    if (activeBranch === 'kohav') return p.stock.kohav;
    return p.stock.mikado + p.stock.kohav;
  };

  // התחלת עריכה inline
  const startEdit = (p, e) => {
    e.stopPropagation();
    setEditing(p.sku);
    setEditCost(p.cost > 0 ? String(p.cost) : '');
    setEditPrice(p.price > 0 ? String(p.price) : '');
  };

  // שמירת מחירים inline
  const saveInline = async (barcode, e) => {
    e?.stopPropagation();
    const cost = parseFloat(editCost) || 0;
    const price = parseFloat(editPrice) || 0;
    if (cost <= 0 && price <= 0) { setEditing(null); return; }
    setBusy(barcode);
    try {
      const upd = {};
      if (cost > 0) upd.cost_price = cost;
      if (price > 0) upd.sell_price = price;
      const { error } = await window.sb.from('products').update(upd).eq('barcode', barcode);
      if (error) throw error;
      (window.toast?.success || alert)('✓ מחירים עודכנו');
      setEditing(null);
      setTimeout(() => window.refreshData && window.refreshData('new-products-edit'), 400);
    } catch (err) {
      (window.toast?.error || alert)('שגיאה: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  // אישור מוצר = שמירת מחירים + סימון כמאושר
  const approveProduct = async (p, e) => {
    e.stopPropagation();
    // אם בעריכה — שמור קודם
    const cost = editing === p.sku ? (parseFloat(editCost) || p.cost) : p.cost;
    const price = editing === p.sku ? (parseFloat(editPrice) || p.price) : p.price;
    if (!cost || cost <= 0 || !price || price <= 0) {
      (window.toast?.error || alert)('⚠ צריך למלא גם עלות וגם מחיר מכירה לפני אישור');
      if (!editing) startEdit(p, e);
      return;
    }
    setBusy(p.sku);
    try {
      const { error } = await window.sb.from('products').update({
        cost_price: cost, sell_price: price, is_active: true,
      }).eq('barcode', p.sku);
      if (error) throw error;
      (window.toast?.success || alert)(`✓ ${p.name.slice(0, 25)} אושר`);
      setEditing(null);
      setTimeout(() => window.refreshData && window.refreshData('new-products-approve'), 400);
    } catch (err) {
      (window.toast?.error || alert)('שגיאה: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">ניהול מלאי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>
            מוצרים חדשים וחסרי מחיר
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {countAll} מוצרים ממתינים · {countMissingCost} ללא עלות · {countMissingPrice} ללא מחיר · {countReady > 0 ? `${countReady} מוכנים לאישור` : ''}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {[
          ['all', `הכל (${countAll})`, ''],
          ['missing_cost', `ללא עלות (${countMissingCost})`, 'warn'],
          ['missing_price', `ללא מחיר (${countMissingPrice})`, 'warn'],
          ['new', `חדשים (${countNew})`, 'accent'],
          ...(countReady > 0 ? [['ready', `מוכנים לאישור (${countReady})`, 'ok']] : []),
        ].map(([id, label, tone]) => (
          <button key={id}
            className={`badge ${filter === id ? (tone || 'ok') : ''}`}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 13, border: filter === id ? 'none' : '1px solid var(--line)' }}
            onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="row" style={{ gap: 12, marginTop: 12 }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
          <ISearch size={15} />
          <input placeholder="חיפוש שם, ברקוד, ספק..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 13 }}>
          <option value="created">תאריך הוספה</option>
          <option value="name">שם מוצר</option>
          <option value="supplier">ספק</option>
        </select>
      </div>

      {/* Table */}
      <Card title={`${items.length} מוצרים`} sub={filter !== 'all' ? 'מסונן' : ''}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>סטטוס</th>
                <th>שם מוצר</th>
                <th>ספק</th>
                <th style={{ textAlign: 'end' }}>עלות</th>
                <th style={{ textAlign: 'end' }}>מחיר מכירה</th>
                <th style={{ textAlign: 'end' }}>מלאי</th>
                <th>נוסף</th>
                <th style={{ textAlign: 'center' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                    {search ? 'אין תוצאות לחיפוש.' : 'הכל מאושר — אין מוצרים ממתינים! 🎉'}
                  </td>
                </tr>
              ) : items.map((p) => {
                const isEd = editing === p.sku;
                const isBusy = busy === p.sku;
                const canApprove = (isEd ? (parseFloat(editCost) > 0 && parseFloat(editPrice) > 0) : (p.cost > 0 && p.price > 0));
                return (
                  <tr key={p.id} style={{ background: isEd ? 'var(--accent-soft)' : undefined }}>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        {p.isNew && <span className="badge accent" style={{ fontSize: 10 }}>חדש</span>}
                        {p.missingCost && <span className="badge warn" style={{ fontSize: 10 }}>ללא עלות</span>}
                        {p.missingPrice && <span className="badge warn" style={{ fontSize: 10 }}>ללא מחיר</span>}
                        {!p.missingCost && !p.missingPrice && <span className="badge ok" style={{ fontSize: 10 }}>מוכן</span>}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={p.name}>{p.name}</td>
                    <td style={{ fontSize: 12 }}>{p.supplier}</td>
                    <td style={{ textAlign: 'end' }}>
                      {isEd ? (
                        <input className="input" type="number" step="0.01" value={editCost}
                               onChange={(e) => setEditCost(e.target.value)} placeholder="עלות"
                               onClick={(e) => e.stopPropagation()}
                               style={{ width: 80, textAlign: 'end', padding: '4px 6px', fontSize: 13 }} />
                      ) : (
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: p.missingCost ? 'var(--danger)' : '' }}>
                          {fmtCurrency(p.cost)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      {isEd ? (
                        <input className="input" type="number" step="0.01" value={editPrice}
                               onChange={(e) => setEditPrice(e.target.value)} placeholder="מחיר"
                               onClick={(e) => e.stopPropagation()}
                               style={{ width: 80, textAlign: 'end', padding: '4px 6px', fontSize: 13 }} />
                      ) : (
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: p.missingPrice ? 'var(--danger)' : '' }}>
                          {fmtCurrency(p.price)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{stockVal(p)}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtDate(p.created_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row" style={{ gap: 4, justifyContent: 'center' }}>
                        {isEd ? (
                          <>
                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(null); }}
                                    disabled={isBusy}>✕</button>
                            <button className="btn btn-sm btn-primary" onClick={(e) => saveInline(p.sku, e)}
                                    disabled={isBusy}>{isBusy ? '…' : '💾'}</button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-ghost" onClick={(e) => startEdit(p, e)}
                                  title="ערוך מחירים">✏️</button>
                        )}
                        <button className={`btn btn-sm ${canApprove ? 'btn-primary' : ''}`}
                                onClick={(e) => approveProduct(p, e)}
                                disabled={isBusy}
                                title={canApprove ? 'אשר מוצר' : 'מלא עלות + מחיר קודם'}
                                style={{ opacity: canApprove ? 1 : 0.5 }}>
                          {isBusy ? '…' : '✓ אשר'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
