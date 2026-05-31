// === Modals — Product detail (with parallel import), Add, Order ===

const Modal = ({ onClose, title, children, footer, width }) => (
  <div className="scrim" onClick={onClose}>
    <div className="modal" style={{ width, maxWidth: 'min(' + (width || '780px') + ', calc(100vw - 24px))' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-title">{title}</div>
        <button className="icon-btn" onClick={onClose}><IClose size={16} /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
);

// === Product detail with parallel import ===
const ProductDetailModal = ({ product, onClose }) => {
  const cat = CATEGORIES.find(c => c.id === product.cat)?.label;
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(product.price);
  const [cost, setCost] = useState(product.cost);
  const [supplier, setSupplier] = useState(product.supplier);
  const [minStock, setMinStock] = useState(product.min_stock ?? 3);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parallel, setParallel] = useState(product.parallel);
  const supName = SUPPLIERS.find(s => s.id === supplier)?.name || supplier;

  // ─── מבצע לקוחות ───
  const [cats, setCats] = useState(window.PROMO_CATEGORIES || []);
  const [promoId, setPromoId] = useState(product.promo?.id || '');
  const [promoBusy, setPromoBusy] = useState(false);
  const [showNewPromo, setShowNewPromo] = useState(false);
  const [npName, setNpName] = useState('');
  const [npUnits, setNpUnits] = useState('');
  const [npTotal, setNpTotal] = useState('');
  const selPromo = cats.find(c => c.id === promoId) || null;

  const removePromo = async () => {
    setPromoBusy(true);
    const { error } = await window.sb.from('product_promos').delete().eq('barcode', product.sku);
    setPromoBusy(false); setPromoId('');
    if (error) { (window.toast?.error || alert)('הסרה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('המבצע הוסר');
    setTimeout(() => window.refreshData && window.refreshData('promo-remove'), 400);
  };

  const savePromo = async () => {
    if (!promoId) return removePromo();
    const cat = cats.find(c => c.id === promoId);
    if (!cat) return;
    setPromoBusy(true);
    const { error } = await window.sb.from('product_promos').upsert({
      barcode: product.sku, promo_id: cat.id, promo_name: cat.name,
      units: cat.units, price_total: cat.price_total, updated_at: new Date().toISOString(),
    }, { onConflict: 'barcode' });
    setPromoBusy(false);
    if (error) { (window.toast?.error || alert)('שמירת מבצע נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('✓ המבצע שויך למוצר');
    setTimeout(() => window.refreshData && window.refreshData('promo-save'), 400);
  };

  const addNewPromo = async () => {
    const units = Number(npUnits) || 0, total = Number(npTotal) || 0;
    const name = (npName.trim()) || (units && total ? `${units} ב-${total}` : '');
    if (!units || !total || !name) { (window.toast?.warn || alert)('מלא שם, כמות יחידות ומחיר כולל'); return; }
    setPromoBusy(true);
    const { data, error } = await window.sb.from('promo_categories')
      .insert({ name, units, price_total: total }).select().single();
    setPromoBusy(false);
    if (error) { (window.toast?.error || alert)('יצירת מבצע נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('✓ סוג מבצע נוצר');
    const nc = { id: data.id, name: data.name, units: data.units, price_total: data.price_total,
                 unit_price: data.units > 0 ? data.price_total / data.units : 0, active: true };
    setCats([...cats, nc]); setPromoId(nc.id);
    setShowNewPromo(false); setNpName(''); setNpUnits(''); setNpTotal('');
    window.refreshData && window.refreshData('promo-cat-add');
  };

  const saveProduct = async () => {
    setSaving(true);
    const parallelUpdate = parallel ? {
      has_parallel: true,
      parallel_barcode: parallel.sku || null,
      parallel_supplier: parallel.supplier || null,
      parallel_cost: parallel.cost || null,
      parallel_unify_sales: parallel.unify || false,
    } : {
      has_parallel: false,
      parallel_barcode: null,
      parallel_supplier: null,
      parallel_cost: null,
      parallel_unify_sales: false,
    };
    const { error } = await window.sb.from('products')
      .update({ sell_price: price, cost_price: cost, supplier,
                min_stock: Math.max(0, Number(minStock) || 0),
                ...parallelUpdate })
      .eq('barcode', product.sku);
    setSaving(false);
    if (error) {
      (window.toast?.error || alert)('שמירה נכשלה: ' + error.message);
      return;
    }
    setSaved(true); setEditing(false);
    (window.toast?.success || alert)('✓ נשמר. יעבור לצינור עד 5 דק׳');
    setTimeout(() => window.refreshData && window.refreshData('post-save'), 500);
  };

  const mainStock = product.stock.mikado + product.stock.kohav;
  const parStock = parallel ? parallel.stock.mikado + parallel.stock.kohav : 0;
  const totalStock = mainStock + parStock;

  const addParallel = () => setParallel({
    sku: '',
    supplier: (SUPPLIERS[0] && SUPPLIERS[0].id) || '',
    cost: 0,
    stock: { mikado: 0, kohav: 0 },
    unify: false,
  });

  const updPar = (k, v) => setParallel({ ...parallel, [k]: v });
  const updParStock = (b, v) => setParallel({ ...parallel, stock: { ...parallel.stock, [b]: v } });

  return (
    <Modal
      onClose={onClose}
      title="כרטיס מוצר"
      width="780px"
      footer={
        <>
          <button className="btn" onClick={onClose}>סגור</button>
          <button className="btn"><IEdit size={14} /> ערוך מלא</button>
          <button className="btn btn-primary">
            <IPlus size={16} /> הזמן מספק
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 22 }}>
        {/* Header */}
        <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="bottle-thumb" style={{ width: 56, height: 76 }}>
            <div className="bottle-thumb-cap" style={{ width: 16, height: 10 }} />
            <div className="bottle-thumb-body" data-cat={product.cat} style={{ width: 36 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="row">
              <Badge tone="accent">{cat}</Badge>
              {parallel && <Badge tone="default"><ISplit size={11} /> ייבוא מקביל</Badge>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}>
              {product.name}
            </div>
            <div className="mono-tiny" style={{ marginTop: 4 }}>
              {product.sku} · עודכן {product.updated}
            </div>
          </div>
        </div>

        {/* Pricing — editable */}
        <div className="card" style={{ background: 'var(--surface)' }}>
          <div style={{ padding: 16 }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>תמחור</div>
              {editing ? (
                <button className="btn btn-sm btn-primary" onClick={saveProduct} disabled={saving}>
                  {saving ? 'שומר…' : <><ICheck size={13} /> שמור</>}
                </button>
              ) : (
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
                  <IEdit size={13} /> ערוך {saved && <span style={{ color: 'var(--ok)' }}>· נשמר ✓</span>}
                </button>
              )}
            </div>
            <div className="grid-3">
              <div>
                <div className="muted" style={{ fontSize: 11 }}>מחיר עלות (ללא מע״מ)</div>
                {editing ? (
                  <>
                    <input className="input" type="number" step="0.01" value={cost}
                           onChange={(e) => setCost(+e.target.value)}
                           style={{ fontSize: 18, fontWeight: 700, padding: '4px 8px' }} />
                    <span className="field-hint">כולל מע״מ: ₪{(Number(cost || 0) * 1.18).toFixed(2)}</span>
                  </>
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ₪{Number(cost || 0).toFixed(2)}
                  </div>
                )}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>מחיר צרכן (כולל מע״מ)</div>
                {editing ? (
                  <input className="input" type="number" step="0.01"
                         value={price} onChange={(e) => setPrice(+e.target.value)}
                         style={{ fontSize: 18, fontWeight: 700, padding: '4px 8px' }} />
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-strong)' }}>
                    ₪{price.toFixed(2)}
                  </div>
                )}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>מרווח (נטו)</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ok)' }}>
                  {(() => { const pn = price / 1.18; return pn > 0 ? (((pn - cost) / pn) * 100).toFixed(0) : '0'; })()}%
                </div>
              </div>
            </div>
            {/* מינימום מלאי — מתי להזמין */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
                          display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>מינימום מלאי להתראה</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  אם מלאי כולל מתחת לזה — תופיע התראה להזמנה
                </div>
              </div>
              {editing ? (
                <input className="input" type="number" min="0" step="1" value={minStock}
                       onChange={(e) => setMinStock(+e.target.value)}
                       style={{ width: 80, fontSize: 16, fontWeight: 700, padding: '4px 8px', textAlign: 'center' }} />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                              padding: '4px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                  {minStock} יח׳
                </div>
              )}
            </div>
          </div>
        </div>

        {/* מבצע לקוחות — שיוך + חישוב רווח אמיתי במחיר מבצע */}
        <div className="card" style={{ background: 'var(--surface)' }}>
          <div style={{ padding: 16 }}>
            <div className="between" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>🏷️ מבצע לקוחות</div>
              {selPromo && (
                <button className="btn btn-sm btn-ghost" onClick={removePromo} disabled={promoBusy}
                        style={{ color: 'var(--danger)' }}>הסר ממבצע</button>
              )}
            </div>
            <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="select" value={promoId} onChange={(e) => setPromoId(e.target.value)}
                      style={{ fontSize: 13, minWidth: 150 }}>
                <option value="">ללא מבצע</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn btn-sm btn-primary" onClick={savePromo} disabled={promoBusy}>
                {promoBusy ? 'שומר…' : 'שמור מבצע'}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowNewPromo(v => !v)}>
                <IPlus size={13} /> מבצע חדש
              </button>
            </div>

            {showNewPromo && (
              <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>שם</div>
                  <input className="input" value={npName} placeholder="3 ב-120"
                         onChange={(e) => setNpName(e.target.value)} style={{ width: 100, padding: '4px 8px' }} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>כמות יח׳</div>
                  <input className="input" type="number" value={npUnits} placeholder="3"
                         onChange={(e) => setNpUnits(e.target.value)} style={{ width: 64, padding: '4px 8px' }} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>מחיר כולל ₪</div>
                  <input className="input" type="number" value={npTotal} placeholder="120"
                         onChange={(e) => setNpTotal(e.target.value)} style={{ width: 84, padding: '4px 8px' }} />
                </div>
                <button className="btn btn-sm btn-primary" onClick={addNewPromo} disabled={promoBusy}>צור</button>
              </div>
            )}

            {selPromo && (() => {
              const unitIncl = selPromo.unit_price;       // כולל מע"מ
              const net = unitIncl / 1.18;
              const profit = net - (cost || 0);
              const margin = net > 0 ? (profit / net) * 100 : 0;
              return (
                <div className="grid-3" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>מחיר ליחידה במבצע</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}>
                      ₪{unitIncl.toFixed(2)}
                    </div>
                    <div className="muted" style={{ fontSize: 10 }}>{selPromo.units} יח׳ ב-₪{selPromo.price_total}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>רווח ליחידה (נטו)</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: profit >= 0 ? 'var(--ok)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                      ₪{profit.toFixed(2)}
                    </div>
                    <div className="muted" style={{ fontSize: 10 }}>מחיר רגיל: ₪{Number(price || 0).toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>מרווח במבצע</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                  color: margin >= 25 ? 'var(--ok)' : margin >= 0 ? 'var(--warn)' : 'var(--danger)' }}>
                      {margin.toFixed(0)}%
                    </div>
                    <div className="muted" style={{ fontSize: 10 }}>
                      {margin < 0 ? '⚠️ הפסד!' : margin < 15 ? 'נמוך' : 'תקין'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Main supplier + stock */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>ספק ראשי</div>
          <div className="parallel-card">
            <div className="parallel-card-header">
              <div className="row">
                <div className="avatar" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12 }}>
                  {supName?.[0]}
                </div>
                <div>
                  {editing ? (
                    <select className="select" value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ fontSize: 13 }}>
                      {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{supName}</div>
                  )}
                  <div className="mono-tiny">{product.sku}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 18 }}>
                <div>
                  <div className="muted" style={{ fontSize: 10.5 }}>עלות</div>
                  <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₪{product.cost.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="parallel-card-body">
              <BranchStockRow branch="mikado" value={product.stock.mikado} />
              <BranchStockRow branch="kohav" value={product.stock.kohav} />
            </div>
          </div>
        </div>

        {/* Parallel import section — only shown if exists */}
        {parallel ? (
          <div>
            <div className="between" style={{ marginBottom: 10 }}>
              <div className="row">
                <div style={{ fontWeight: 700, fontSize: 13 }}>ייבוא מקביל</div>
                <Badge tone="default"><ISplit size={11} /> ספק משני</Badge>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setParallel(null)}
                      style={{ color: 'var(--danger)' }}>
                <ITrash size={13} /> מחק
              </button>
            </div>
            <div className="parallel-card parallel-card-secondary">
              <div className="parallel-card-header">
                <div className="row" style={{ flex: 1, gap: 10 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label" style={{ fontSize: 10.5 }}>ברקוד משני</label>
                    <input className="input" value={parallel.sku}
                           onChange={(e) => updPar('sku', e.target.value)}
                           placeholder="7290000000000"
                           style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label" style={{ fontSize: 10.5 }}>ספק משני</label>
                    <select className="select" value={parallel.supplier}
                            onChange={(e) => updPar('supplier', e.target.value)}>
                      {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ width: 110 }}>
                    <label className="field-label" style={{ fontSize: 10.5 }}>עלות משנית</label>
                    <input className="input" type="number" step="0.01"
                           value={parallel.cost}
                           onChange={(e) => updPar('cost', +e.target.value)} />
                  </div>
                  <div className="field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                    <label className="row" style={{ gap: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={parallel.unify || false}
                             onChange={(e) => updPar('unify', e.target.checked)} />
                      <span className="muted">אחד מכירות</span>
                    </label>
                    {parallel.unify && (
                      <div className="muted" style={{ fontSize: 10, marginTop: 3, color: 'var(--ok)' }}>
                        ✓ מכירות שני הברקודים יסוכמו יחד
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="parallel-card-body">
                <BranchStockRow
                  branch="mikado"
                  value={parallel.stock.mikado}
                  editable
                  onChange={(v) => updParStock('mikado', v)}
                />
                <BranchStockRow
                  branch="kohav"
                  value={parallel.stock.kohav}
                  editable
                  onChange={(v) => updParStock('kohav', v)}
                />
              </div>
            </div>
            {parallel.cost > 0 && (
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6, textAlign: 'end' }}>
                חיסכון של ₪{(product.cost - parallel.cost).toFixed(2)} ליחידה לעומת הספק הראשי
              </div>
            )}
          </div>
        ) : (
          <button className="add-parallel-btn" onClick={addParallel}>
            <IPlus size={14} /> הוסף ייבוא מקביל
            <span className="muted" style={{ fontSize: 11, marginInlineStart: 6 }}>
              אותו מוצר מיבואן נוסף, עם ברקוד וספק שונים
            </span>
          </button>
        )}

        {/* Totals */}
        <div className="total-strip">
          <div>
            <div className="muted" style={{ fontSize: 11 }}>סה״כ מלאי כולל</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {totalStock} יח׳
            </div>
          </div>
          <div className="total-strip-divider" />
          <div>
            <div className="muted" style={{ fontSize: 11 }}>ערך מלאי</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ₪{(mainStock * product.cost + parStock * (parallel?.cost || 0)).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="total-strip-divider" />
          <div>
            <div className="muted" style={{ fontSize: 11 }}>פוטנציאל מכירה</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ok)' }}>
              ₪{(totalStock * price).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const BranchStockRow = ({ branch, value, editable = false, onChange }) => {
  const b = BRANCHES.find(x => x.id === branch);
  const tone = value < 0 ? 'danger' : value === 0 ? 'warn' : 'ok';
  return (
    <div className="branch-stock-row">
      <div className="row" style={{ flex: 1 }}>
        <span className="branch-dot" style={{ background: b.color, width: 10, height: 10 }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
      </div>
      {editable ? (
        <input
          type="number"
          className="input"
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          style={{ width: 80, textAlign: 'center', padding: '4px 8px', fontWeight: 700 }}
        />
      ) : (
        <span className={`stock-pill stock-${tone}`} style={{ minWidth: 48 }}>{value}</span>
      )}
    </div>
  );
};

// === Add product modal ===
const AddProductModal = ({ onClose, initialBarcode }) => {
  const [form, setForm] = useState({
    name: '', sku: initialBarcode || '', cat: 'red', price: '', cost: '',
    supplier: '', mikado: 0, kohav: 0
  });
  const set = (k, v) => setForm({ ...form, [k]: v });
  const [saving, setSaving] = React.useState(false);
  const [costInclVat, setCostInclVat] = React.useState(false);  // אם דלוק — העלות שהוזנה כוללת מע"מ, תומר ל-÷1.18

  const saveProduct = async () => {
    if (!form.name || !form.sku) {
      (window.toast?.warn || alert)('שם וברקוד הם שדות חובה');
      return;
    }
    setSaving(true);
    const catLabel = (CATEGORIES.find((c) => c.id === form.cat) || {}).label || form.cat;
    const { error } = await window.sb.from('products').insert({
      name: form.name, barcode: String(form.sku), category: catLabel,
      supplier: form.supplier || 'לא ידוע',
      cost_price: Number((costInclVat ? (Number(form.cost) || 0) / 1.18 : (Number(form.cost) || 0)).toFixed(2)),
      sell_price: Number(form.price) || 0,
      stock_mikado: Number(form.mikado) || 0, stock_kochav: Number(form.kohav) || 0,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      (window.toast?.error || alert)('שמירה נכשלה: ' + error.message);
      return;
    }
    (window.toast?.success || alert)('✓ המוצר נוסף');
    setTimeout(() => window.refreshData && window.refreshData('post-add'), 500);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="הוספת מוצר חדש"
      width="640px"
      footer={
        <>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={saveProduct} disabled={saving}>
            <ICheck size={16} /> {saving ? 'שומר…' : 'הוסף מוצר'}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="grid-2">
          <div className="field">
            <label className="field-label">שם מוצר *</label>
            <input className="input" placeholder="יקב רקנאטי קברנה סוביניון 2021"
                   value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">ברקוד *</label>
            <input className="input" placeholder="7290000000000"
                   value={form.sku} onChange={(e) => set('sku', e.target.value)}
                   style={{ fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="field-label">קטגוריה</label>
            <select className="select" value={form.cat} onChange={(e) => set('cat', e.target.value)}>
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">ספק</label>
            <select className="select" value={form.supplier} onChange={(e) => set('supplier', e.target.value)}>
              <option value="">— בחר —</option>
              {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="field-label">מחיר עלות {costInclVat ? '(כולל מע״מ)' : '(ללא מע״מ)'}</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
                   value={form.cost} onChange={(e) => set('cost', e.target.value)} />
            <label className="row" style={{ gap: 6, marginTop: 6, fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={costInclVat}
                     onChange={(e) => setCostInclVat(e.target.checked)} />
              <span className="muted">הזנתי כולל מע״מ — יומר אוטומטית לעלות נטו (÷1.18)</span>
            </label>
            {form.cost > 0 && (
              <span className="field-hint">
                {costInclVat
                  ? `עלות נטו שתישמר: ₪${(form.cost / 1.18).toFixed(2)}`
                  : `כולל מע״מ: ₪${(form.cost * 1.18).toFixed(2)}`}
              </span>
            )}
          </div>
          <div className="field">
            <label className="field-label">מחיר צרכן (כולל מע״מ ₪)</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
                   value={form.price} onChange={(e) => set('price', e.target.value)} />
            {form.cost > 0 && form.price > 0 && (() => {
              const costExcl = costInclVat ? form.cost / 1.18 : Number(form.cost);
              const priceNet = form.price / 1.18;
              const mg = priceNet > 0 ? ((priceNet - costExcl) / priceNet) * 100 : 0;
              return (
                <span className="field-hint">
                  מרווח: {mg.toFixed(0)}% · מחיר נטו ₪{priceNet.toFixed(2)}
                </span>
              );
            })()}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>מלאי התחלתי לפי סניף</div>
          <div className="grid-2">
            {BRANCHES.map(b => (
              <div key={b.id} className="field"
                   style={{ background: 'var(--surface)', padding: 12, borderRadius: 'var(--r-md)' }}>
                <div className="row">
                  <span className="branch-dot" style={{ background: b.color, width: 10, height: 10 }} />
                  <span style={{ fontWeight: 600 }}>{b.name}</span>
                </div>
                <input className="input" type="number" value={form[b.id]}
                       onChange={(e) => set(b.id, +e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// === Quick supplier order modal ===
const OrderModal = ({ product, onClose }) => {
  const [qty, setQty] = useState(24);
  return (
    <Modal
      onClose={onClose}
      title="הזמנה מהירה מספק"
      width="520px"
      footer={
        <>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={onClose}>
            <ICheck size={16} /> שלח הזמנה ({qty} יח׳)
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="row" style={{ background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-md)' }}>
          <div className="bottle-thumb">
            <div className="bottle-thumb-cap" />
            <div className="bottle-thumb-body" data-cat={product.cat} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{product.name}</div>
            <div className="row-product-sku">{product.sku}</div>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="field-label">ספק</label>
            <select className="select" defaultValue={product.supplier}>
              {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">סניף יעד</label>
            <select className="select">
              <option>מיקדו</option>
              <option>כוכב הצפון</option>
              <option>שני הסניפים</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field-label">כמות להזמנה</label>
          <input className="input" type="number" value={qty} onChange={(e) => setQty(+e.target.value)} />
        </div>
        <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', fontSize: 13 }}>
          <div className="between">
            <span>עלות משוערת:</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ₪{(qty * product.cost).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, { Modal, ProductDetailModal, AddProductModal, OrderModal });
