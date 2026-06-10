// === Supplier Order Builder — pick a supplier, build & export an order ===

const SupplierHub = ({ onSelectSupplier }) => {
  useLiveData();
  const [planOpen, setPlanOpen] = useState(false);
  const dmin = (window.SETTINGS && window.SETTINGS.defaultMin) || 3;

  // Per-supplier aggregates
  const supplierData = SUPPLIERS.map(s => {
    const items = PRODUCTS.filter(p => p.supplier === s.id);
    const totalValue = items.reduce((acc, p) => acc + (p.stock.mikado + p.stock.kohav) * p.cost, 0);
    const lowItems = items.filter(p => {
      const min = p.min_stock > 0 ? p.min_stock : dmin;
      return (p.stock.mikado + p.stock.kohav) < min;
    }).length;
    const last = LAST_RECEIVED[s.id];
    const past = PAST_ORDERS[s.id] || [];
    return { ...s, items, totalValue, lowItems, last, past };
  });

  // תכנון הזמנות — כל המוצרים מתחת למינימום, מקובצים לפי ספק (בסיס למחזור הזמנות)
  const plan = React.useMemo(() => {
    const rows = [];
    let units = 0, value = 0;
    PRODUCTS.forEach(p => {
      const min = p.min_stock > 0 ? p.min_stock : dmin;
      const totalStock = p.stock.mikado + p.stock.kohav;
      const need = Math.max(0, min - totalStock);
      if (need > 0) { rows.push({ ...p, need, min }); units += need; value += need * p.cost; }
    });
    const bySup = {};
    rows.forEach(r => { (bySup[r.supplier] = bySup[r.supplier] || []).push(r); });
    const groups = Object.keys(bySup).map(sid => {
      const list = bySup[sid].sort((a, b) => b.need - a.need);
      return { sid, name: supLabel(sid), list, units: list.reduce((a, x) => a + x.need, 0), value: list.reduce((a, x) => a + x.need * x.cost, 0) };
    }).sort((a, b) => b.value - a.value);
    return { rows, units, value, groups, count: rows.length };
  }, [window.LAST_REFRESH]);

  const openOrdersCount = ORDERS.filter(o => o.status !== 'completed').length;

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">הזמנות לספקים</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>בניית הזמנה לספק</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            בחר ספק כדי לבנות הזמנה · {openOrdersCount} הזמנות פעילות
          </div>
        </div>
      </div>

      {/* תכנון הזמנות — מתחת למינימום, מקובץ לפי ספק */}
      <Card>
        <div className="between" style={{ padding: '4px 2px', cursor: 'pointer' }} onClick={() => setPlanOpen(!planOpen)}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>📋 תכנון הזמנות — מתחת למינימום</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
              {plan.count > 0
                ? `${plan.count} מוצרים · ${plan.units} יח׳ להזמנה · ₪${Math.round(plan.value).toLocaleString('he-IL')} (לפני מע״מ)`
                : 'כל המוצרים מעל המינימום ✓'}
            </div>
          </div>
          {plan.count > 0 && (
            <button className="btn btn-sm">{planOpen ? 'הסתר ▲' : 'הצג תכנון ▼'}</button>
          )}
        </div>

        {planOpen && plan.count > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {plan.groups.map(g => (
              <div key={g.sid}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => onSelectSupplier(g.sid)}
                          style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {g.name} <IChevronLeft size={13} />
                  </button>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {g.list.length} פריטים · {g.units} יח׳ · ₪{Math.round(g.value).toLocaleString('he-IL')}
                  </span>
                </div>
                <table className="tbl" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th>ברקוד</th>
                      <th>מוצר</th>
                      <th style={{ textAlign: 'center' }}>מיקדו</th>
                      <th style={{ textAlign: 'center' }}>כוכב</th>
                      <th style={{ textAlign: 'center' }}>סה״כ</th>
                      <th style={{ textAlign: 'center' }}>מינ׳</th>
                      <th style={{ textAlign: 'center' }}>להזמין</th>
                      <th style={{ textAlign: 'end' }}>עלות שורה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.list.map(p => (
                      <tr key={p.id}>
                        <td className="mono-tiny">{p.sku}</td>
                        <td>{p.name}</td>
                        <td style={{ textAlign: 'center' }}>{p.stock.mikado}</td>
                        <td style={{ textAlign: 'center' }}>{p.stock.kohav}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>{p.stock.mikado + p.stock.kohav}</td>
                        <td style={{ textAlign: 'center' }}>{p.min}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-strong)' }}>{p.need}</td>
                        <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>₪{Math.round(p.need * p.cost).toLocaleString('he-IL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Supplier picker cards */}
      <div className="grid-3">
        {supplierData.map(s => (
          <button key={s.id} className="supplier-pick" onClick={() => onSelectSupplier(s.id)}>
            <div className="supplier-pick-header">
              <div className="avatar" style={{
                width: 40, height: 40, borderRadius: 10, fontSize: 14,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)'
              }}>
                {s.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.name}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {s.items.length} פריטים · אספקה {s.lead}
                </div>
              </div>
              {s.lowItems > 0 && <Badge tone="warn">{s.lowItems} נמוך</Badge>}
            </div>

            <div className="supplier-pick-stats">
              <div>
                <div className="muted" style={{ fontSize: 10.5 }}>ערך מלאי</div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 15 }}>
                  ₪{Math.round(s.totalValue).toLocaleString('he-IL')}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 10.5 }}>הזמנה אחרונה</div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                  {s.past[0]?.date.split('/').slice(0, 2).join('/') || '—'}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 10.5 }}>קליטה אחרונה</div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                  {s.last?.date.split('/').slice(0, 2).join('/') || '—'}
                </div>
              </div>
            </div>

            <div className="supplier-pick-cta">
              <span>בניית הזמנה</span>
              <IChevronLeft size={14} />
            </div>
          </button>
        ))}
      </div>

      {/* Open orders summary at bottom */}
      <Card title="הזמנות פתוחות" sub="כל הספקים">
        <table className="tbl">
          <thead>
            <tr>
              <th>מס׳</th>
              <th>ספק</th>
              <th>סניף</th>
              <th>צפי הגעה</th>
              <th>פריטים</th>
              <th style={{ textAlign: 'end' }}>סכום</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map(o => (
              <tr key={o.id} onClick={() => onSelectSupplier(o.supplier)}>
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
                <td>{o.eta}</td>
                <td>{o.items} פריטים</td>
                <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  ₪{o.sum.toLocaleString('he-IL')}
                </td>
                <td><Badge tone={o.tone}>{STATUS_LABELS[o.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// === Order Builder — full-screen flow for one supplier ===
const OrderBuilder = ({ supplierId, onBack }) => {
  const supplier = SUPPLIERS.find(s => s.id === supplierId);
  const products = useMemo(() => PRODUCTS.filter(p => p.supplier === supplierId), [supplierId]);
  const past = PAST_ORDERS[supplierId] || [];
  const last = LAST_RECEIVED[supplierId];
  const isMobile = useIsMobile();

  // qty per product id
  const [qty, setQty] = useState({});
  const [view, setView] = useState('items'); // items | past | received
  const [branch, setBranch] = useState('both');
  const [exportKind, setExportKind] = useState(null); // 'whatsapp' | 'pdf' | null
  const [searchQ, setSearchQ] = useState('');
  const [cartOpen, setCartOpen] = useState(false);   // מובייל: עגלה כ-bottom-sheet

  const updateQty = (id, v) => {
    const next = { ...qty };
    if (v <= 0) delete next[id];
    else next[id] = v;
    setQty(next);
  };
  const inc = (id) => updateQty(id, (qty[id] || 0) + 1);
  const dec = (id) => updateQty(id, Math.max(0, (qty[id] || 0) - 1));
  const addPack = (id) => updateQty(id, (qty[id] || 0) + 6);

  const cartItems = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ product: products.find(p => p.id === id), qty: q }))
    .filter(x => x.product);
  const cartTotal = cartItems.reduce((a, x) => a + x.qty * x.product.cost, 0);
  const cartUnits = cartItems.reduce((a, x) => a + x.qty, 0);

  const loadFromPast = (order) => {
    const next = {};
    order.items.forEach(({ sku, qty: q }) => {
      const p = products.find(x => x.id === sku);
      if (p) next[p.id] = q;
    });
    setQty(next);
    setView('items');
  };

  const filledProducts = useMemo(() => {
    if (!searchQ) return products;
    const Q = searchQ.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(Q) || p.sku.includes(searchQ)
    );
  }, [searchQ, products]);

  // הצעת כמות: כמה להזמין כדי להגיע למינימום הכולל (min_stock = מינ׳ חנותי, שני הסניפים יחד).
  const suggest = (p) => {
    const min = p.min_stock > 0 ? p.min_stock : ((window.SETTINGS && window.SETTINGS.defaultMin) || 3);
    const totalStock = p.stock.mikado + p.stock.kohav;
    return Math.max(0, min - totalStock);
  };

  return (
    <div className="page order-builder">
      {/* Header */}
      <div className="between">
        <div className="row" style={{ gap: 14 }}>
          <button className="btn btn-ghost" onClick={onBack}>
            <IChevronRight size={16} /> כל הספקים
          </button>
          <div>
            <div className="row">
              <div className="avatar" style={{
                width: 36, height: 36, borderRadius: 9, fontSize: 14,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)'
              }}>
                {supplier.name[0]}
              </div>
              <div>
                <div className="page-title" style={{ fontSize: 19 }}>הזמנה ל{supplier.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  אספקה {supplier.lead} · {products.length} פריטים בקטלוג
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <button className="btn"
                  onClick={() => setQty({})}
                  disabled={cartUnits === 0}>
            נקה הזמנה
          </button>
          <button className="btn"
                  onClick={() => past[0] && loadFromPast(past[0])}
                  disabled={!past[0]}>
            <IUpload size={14} /> שכפל אחרונה
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="chips">
        <button className={`chip ${view === 'items' ? 'active' : ''}`} onClick={() => setView('items')}>
          📦 בנה הזמנה
        </button>
        <button className={`chip ${view === 'past' ? 'active' : ''}`} onClick={() => setView('past')}>
          📋 הזמנות אחרונות ({past.length})
        </button>
        <button className={`chip ${view === 'received' ? 'active' : ''}`} onClick={() => setView('received')}>
          📥 קליטה אחרונה
        </button>
      </div>

      {/* Main layout */}
      <div className="order-builder-grid">
        {/* Left: main panel */}
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          {view === 'items' && (
            <>
              <div className="search-bar" style={{ maxWidth: 'none', margin: 0 }}>
                <ISearch size={15} />
                <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                       placeholder="חיפוש בקטלוג של הספק…" />
              </div>
              {isMobile ? (
                <MobileCardList
                  items={filledProducts}
                  keyOf={(p) => p.id}
                  empty="לא נמצאו מוצרים בקטלוג הספק"
                  renderCard={(p) => {
                    const cur = qty[p.id] || 0;
                    const sg = suggest(p);
                    return (
                      <React.Fragment>
                        <div className="mcard-head">
                          <div style={{ minWidth: 0 }}>
                            <div className="mcard-title">{p.name}</div>
                            <div className="mcard-sub">{p.sku}</div>
                          </div>
                          <div style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{p.cost.toFixed(2)}</div>
                            {cur > 0 && (
                              <div style={{ fontSize: 11.5, color: 'var(--accent-strong)', fontWeight: 700 }}>
                                סה״כ ₪{(cur * p.cost).toFixed(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mcard-meta">
                          <div className="mcard-meta-item">
                            <div className="mcard-meta-label"><span className="branch-dot" style={{ background: BRANCHES[0].color, display: 'inline-block', width: 7, height: 7, borderRadius: 2, marginInlineEnd: 4 }} />מיקדו</div>
                            <div className="mcard-meta-value">{p.stock.mikado}</div>
                          </div>
                          <div className="mcard-meta-item">
                            <div className="mcard-meta-label"><span className="branch-dot" style={{ background: BRANCHES[1].color, display: 'inline-block', width: 7, height: 7, borderRadius: 2, marginInlineEnd: 4 }} />כוכב</div>
                            <div className="mcard-meta-value">{p.stock.kohav}</div>
                          </div>
                          <div className="mcard-meta-item">
                            <div className="mcard-meta-label">הצעה</div>
                            <div className="mcard-meta-value">
                              {sg > 0 ? (
                                <button className="suggest-pill" onClick={() => updateQty(p.id, sg)}>+{sg}</button>
                              ) : '—'}
                            </div>
                          </div>
                        </div>
                        <div className="mcard-actions">
                          <div className="qty-stepper" style={{ flex: 1 }}>
                            <button onClick={() => dec(p.id)} disabled={cur === 0}>−</button>
                            <input type="number" value={cur} min="0"
                                   onChange={(e) => updateQty(p.id, Math.max(0, +e.target.value || 0))} />
                            <button onClick={() => inc(p.id)}>+</button>
                            <button className="qty-pack" onClick={() => addPack(p.id)} title="הוסף ארגז (6)">+6</button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }}
                />
              ) : (
              <Card>
                <table className="tbl tbl-builder">
                  <thead>
                    <tr>
                      <th>מוצר</th>
                      <th style={{ textAlign: 'center' }}>מלאי נוכחי</th>
                      <th style={{ textAlign: 'end' }}>עלות</th>
                      <th style={{ textAlign: 'center' }}>הצעה</th>
                      <th style={{ textAlign: 'center' }}>כמות להזמנה</th>
                      <th style={{ textAlign: 'end' }}>סה״כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledProducts.map(p => {
                      const cur = qty[p.id] || 0;
                      const totalStock = p.stock.mikado + p.stock.kohav;
                      const sg = suggest(p);
                      return (
                        <tr key={p.id} className={cur > 0 ? 'row-active' : ''}>
                          <td>
                            <div className="row-product">
                              <div className="bottle-thumb" style={{ width: 28, height: 36 }}>
                                <div className="bottle-thumb-cap" style={{ width: 8, height: 4 }} />
                                <div className="bottle-thumb-body" data-cat={p.cat} style={{ width: 18 }} />
                              </div>
                              <div>
                                <div className="row-product-name" style={{ fontSize: 13 }}>{p.name}</div>
                                <div className="mono-tiny">{p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12 }}>
                            <span className="row" style={{ justifyContent: 'center', gap: 8 }}>
                              <span title="מיקדו">
                                <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                                {p.stock.mikado}
                              </span>
                              <span title="כוכב">
                                <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                                {p.stock.kohav}
                              </span>
                            </span>
                          </td>
                          <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                            ₪{p.cost.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {sg > 0 ? (
                              <button className="suggest-pill" onClick={() => updateQty(p.id, sg)}>
                                +{sg}
                              </button>
                            ) : <span className="muted">—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="qty-stepper">
                              <button onClick={() => dec(p.id)} disabled={cur === 0}>−</button>
                              <input type="number" value={cur} min="0"
                                     onChange={(e) => updateQty(p.id, Math.max(0, +e.target.value || 0))} />
                              <button onClick={() => inc(p.id)}>+</button>
                              <button className="qty-pack" onClick={() => addPack(p.id)} title="הוסף ארגז (6)">
                                +6
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums',
                                       fontWeight: cur > 0 ? 700 : 400,
                                       color: cur > 0 ? 'var(--accent-strong)' : 'var(--ink-3)' }}>
                            ₪{(cur * p.cost).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
              )}
            </>
          )}

          {view === 'past' && (
            <Card title="הזמנות אחרונות" sub="לחץ על הזמנה כדי לטעון אותה לעגלה">
              {past.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
                  אין עדיין הזמנות מספק זה
                </div>
              ) : past.map(o => (
                <div key={o.id} className="past-order-row">
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="mono-tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.id}</span>
                      <span className="muted">·</span>
                      <span style={{ fontSize: 13 }}>{o.date}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {o.items.length} פריטים · {o.items.reduce((a, x) => a + x.qty, 0)} יחידות
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {o.items.slice(0, 3).map(({ sku, qty: q }) => {
                        const p = PRODUCTS.find(x => x.id === sku);
                        return p ? (
                          <span key={sku} className="past-item-chip">
                            {p.name.split(' ').slice(0, 3).join(' ')} ×{q}
                          </span>
                        ) : null;
                      })}
                      {o.items.length > 3 && (
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          + עוד {o.items.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ₪{o.total.toLocaleString('he-IL')}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 8 }}>
                      <button className="btn btn-sm" onClick={() => loadFromPast(o)}>
                        <IUpload size={12} /> שכפל
                      </button>
                      <button className="btn btn-sm btn-ghost">פרטים</button>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {view === 'received' && (
            <Card title="קליטה אחרונה" sub={last ? `${last.date} · ${last.items} פריטים` : ''}>
              {!last ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
                  אין נתוני קליטה
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="kpi">
                      <div className="kpi-label">תאריך קליטה</div>
                      <div className="kpi-value" style={{ fontSize: 20 }}>{last.date}</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi-label">סך הקליטה</div>
                      <div className="kpi-value" style={{ fontSize: 22 }}>₪{last.total.toLocaleString('he-IL')}</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi-label">פריטים</div>
                      <div className="kpi-value" style={{ fontSize: 22 }}>{last.items}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-2)' }}>
                    הקליטה הקודמת שימשה כבסיס למלאי הנוכחי. ראה בטאב המלאי לפילוח לפי סניף.
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: cart panel — דסקטופ: sidebar דביק · מובייל: bottom-sheet */}
        {isMobile && cartOpen && <div className="cart-sheet-backdrop" onClick={() => setCartOpen(false)} />}
        {(!isMobile || cartOpen) && (
        <div className={`order-cart ${isMobile ? 'cart-sheet' : ''}`}>
          <div className="order-cart-header">
            <div style={{ fontWeight: 700, fontSize: 14 }}>סיכום הזמנה</div>
            <div className="row" style={{ gap: 8 }}>
              <Badge tone="accent">{cartItems.length} פריטים</Badge>
              {isMobile && (
                <button className="icon-btn" onClick={() => setCartOpen(false)} title="סגור">
                  <IClose size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="order-cart-body">
            {cartItems.length === 0 ? (
              <div className="muted" style={{ padding: 32, textAlign: 'center', fontSize: 13 }}>
                עדיין לא הוספת מוצרים
              </div>
            ) : cartItems.map(({ product, qty: q }) => (
              <div key={product.id} className="order-cart-line">
                <div className="bottle-thumb" style={{ width: 22, height: 30 }}>
                  <div className="bottle-thumb-cap" style={{ width: 6, height: 3 }} />
                  <div className="bottle-thumb-body" data-cat={product.cat} style={{ width: 14 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                                overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    ×{q} · ₪{product.cost.toFixed(2)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                  ₪{(q * product.cost).toFixed(0)}
                </div>
                <button className="icon-btn" style={{ width: 22, height: 22 }}
                        onClick={() => updateQty(product.id, 0)}>
                  <IClose size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Branch selector */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
            <div className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>סניף יעד</div>
            <div className="branch-switch" style={{ margin: 0 }}>
              <button className={`branch-opt ${branch === 'both' ? 'active' : ''}`}
                      onClick={() => setBranch('both')}>שניהם</button>
              <button className={`branch-opt ${branch === 'mikado' ? 'active' : ''}`}
                      onClick={() => setBranch('mikado')}>
                <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                מיקדו
              </button>
              <button className={`branch-opt ${branch === 'kohav' ? 'active' : ''}`}
                      onClick={() => setBranch('kohav')}>
                <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                כוכב
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="order-cart-totals">
            <div className="between" style={{ fontSize: 13 }}>
              <span className="muted">סך יחידות</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cartUnits}</span>
            </div>
            <div className="between" style={{ fontSize: 13 }}>
              <span className="muted">לפני מע״מ</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ₪{cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="between" style={{ fontSize: 16, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 700 }}>סה״כ</span>
              <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>
                ₪{(cartTotal * 1.18).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Export actions */}
          <div className="order-cart-actions">
            <button className="btn btn-wa"
                    disabled={cartUnits === 0}
                    onClick={() => setExportKind('whatsapp')}>
              <IWhatsApp size={16} /> ייצוא ל-WhatsApp
            </button>
            <button className="btn"
                    disabled={cartUnits === 0}
                    onClick={() => setExportKind('pdf')}>
              <IFile size={14} /> PDF
            </button>
            <button className="btn btn-primary"
                    disabled={cartUnits === 0}
                    onClick={() => alert('הזמנה נשמרה במערכת')}>
              <ICheck size={14} /> שמור ושלח
            </button>
          </div>
        </div>
        )}

        {/* מובייל: בר עגלה מכווץ — דביק מעל הניווט התחתון */}
        {isMobile && !cartOpen && (
          <button className="cart-bar" onClick={() => setCartOpen(true)}>
            <span>🛒 {cartItems.length} פריטים · {cartUnits} יח׳</span>
            <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              ₪{(cartTotal * 1.18).toFixed(0)} · הצג
            </span>
          </button>
        )}
      </div>

      {/* Export modals */}
      {exportKind === 'whatsapp' && (
        <WhatsAppExportModal
          supplier={supplier}
          items={cartItems}
          total={cartTotal}
          branch={branch}
          onClose={() => setExportKind(null)}
        />
      )}
      {exportKind === 'pdf' && (
        <PdfExportModal
          supplier={supplier}
          items={cartItems}
          total={cartTotal}
          branch={branch}
          onClose={() => setExportKind(null)}
        />
      )}
    </div>
  );
};

// === WhatsApp Export Modal ===
const WhatsAppExportModal = ({ supplier, items, total, branch, onClose }) => {
  const branchLabel = branch === 'both' ? 'מיקדו + כוכב הצפון'
                    : (BRANCHES.find(b => b.id === branch)?.name || '');

  const message = [
    `🍷 *הזמנה - ${supplier.name}*`,
    `📅 תאריך: ${new Date().toLocaleDateString('he-IL')}`,
    `🏪 סניף: ${branchLabel}`,
    ``,
    `*פריטים:*`,
    ...items.map((x, i) => `${i + 1}. ${x.product.name} - ${x.qty} יח׳ (₪${x.product.cost.toFixed(2)})`),
    ``,
    `─────────────`,
    `סה״כ פריטים: ${items.length}`,
    `סה״כ יחידות: ${items.reduce((a, x) => a + x.qty, 0)}`,
    `סה״כ לפני מע״מ: ₪${total.toFixed(2)}`,
    `*סה״כ כולל מע״מ: ₪${(total * 1.18).toFixed(2)}*`,
    ``,
    `תודה! 🙏`,
  ].join('\n');

  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const sendWA = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      onClose={onClose}
      title="ייצוא ל-WhatsApp"
      width="560px"
      footer={
        <>
          <button className="btn" onClick={onClose}>סגור</button>
          <button className="btn" onClick={copy}>
            {copied ? <><ICheck size={14} /> הועתק</> : <><ICopy size={14} /> העתק</>}
          </button>
          <button className="btn btn-wa" onClick={sendWA}>
            <IWhatsApp size={14} /> פתח WhatsApp
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="muted" style={{ fontSize: 12.5 }}>
          תצוגה מקדימה של הודעת ההזמנה. ניתן להעתיק או לפתוח ישירות ב-WhatsApp Web.
        </div>
        <div className="wa-preview">
          <div className="wa-bubble">
            <pre>{message}</pre>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// === PDF Export Modal ===
const PdfExportModal = ({ supplier, items, total, branch, onClose }) => {
  const branchLabel = branch === 'both' ? 'מיקדו + כוכב הצפון'
                    : (BRANCHES.find(b => b.id === branch)?.name || '');
  const date = new Date().toLocaleDateString('he-IL');

  const handlePrint = () => {
    // In production, use a PDF lib or window.print after rendering a print-only stylesheet.
    window.print();
  };

  return (
    <Modal
      onClose={onClose}
      title="תצוגה לייצוא PDF"
      width="720px"
      footer={
        <>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn"><IDownload size={14} /> הורד PDF</button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <IFile size={14} /> הדפס / שמור
          </button>
        </>
      }
    >
      <div className="pdf-preview">
        <div className="pdf-header">
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>הזמנה לספק</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>VinTrack · ניהול מלאי</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontWeight: 700 }}>מס׳ הזמנה: #{Math.floor(Math.random() * 9000 + 1000)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{date}</div>
          </div>
        </div>

        <div className="pdf-meta">
          <div>
            <div className="muted" style={{ fontSize: 10.5 }}>ספק</div>
            <div style={{ fontWeight: 700 }}>{supplier.name}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 10.5 }}>סניף יעד</div>
            <div style={{ fontWeight: 700 }}>{branchLabel}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 10.5 }}>אספקה צפויה</div>
            <div style={{ fontWeight: 700 }}>{supplier.lead}</div>
          </div>
        </div>

        <table className="tbl pdf-tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>ברקוד</th>
              <th>שם מוצר</th>
              <th style={{ textAlign: 'center' }}>כמות</th>
              <th style={{ textAlign: 'end' }}>מחיר ליחידה</th>
              <th style={{ textAlign: 'end' }}>סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x, i) => (
              <tr key={x.product.id}>
                <td>{i + 1}</td>
                <td className="mono-tiny">{x.product.sku}</td>
                <td>{x.product.name}</td>
                <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {x.qty}
                </td>
                <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                  ₪{x.product.cost.toFixed(2)}
                </td>
                <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  ₪{(x.qty * x.product.cost).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pdf-totals">
          <div className="between">
            <span>סה״כ פריטים:</span>
            <span style={{ fontWeight: 600 }}>{items.length}</span>
          </div>
          <div className="between">
            <span>סה״כ יחידות:</span>
            <span style={{ fontWeight: 600 }}>{items.reduce((a, x) => a + x.qty, 0)}</span>
          </div>
          <div className="between">
            <span>סה״כ לפני מע״מ:</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              ₪{total.toFixed(2)}
            </span>
          </div>
          <div className="between">
            <span>מע״מ 18%:</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>₪{(total * 0.18).toFixed(2)}</span>
          </div>
          <div className="between" style={{ borderTop: '2px solid var(--ink)', paddingTop: 6, fontSize: 16 }}>
            <span style={{ fontWeight: 800 }}>סה״כ לתשלום:</span>
            <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              ₪{(total * 1.18).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, { SupplierHub, OrderBuilder, WhatsAppExportModal, PdfExportModal });
