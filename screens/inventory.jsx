// === Inventory screen — wine store, 2 branches, parallel imports ===

const PAGE_SIZE = 12;

const Inventory = ({ onOpen, onOpenScan }) => {
  const [cat, setCat] = useState('all');
  const [sup, setSup] = useState('all');
  const [stock, setStock] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Search matches main SKU OR parallel import SKU
  const filtered = useMemo(() => {
    return PRODUCTS.filter(p => {
      if (cat !== 'all' && p.cat !== cat) return false;
      if (sup !== 'all' && p.supplier !== sup && p.parallel?.supplier !== sup) return false;
      if (stock === 'low' && p.total >= 10) return false;
      if (stock === 'negative' && p.stock.mikado >= 0 && p.stock.kohav >= 0) return false;
      if (q) {
        const Q = q.toLowerCase();
        const matchMain = p.name.toLowerCase().includes(Q) || p.sku.includes(q);
        const matchPar = p.parallel && p.parallel.sku.includes(q);
        if (!matchMain && !matchPar) return false;
      }
      return true;
    });
  }, [cat, sup, stock, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const fakeTotalCount = 1400 - (PRODUCTS.length - filtered.length);

  // Negative items count
  const negCount = PRODUCTS.filter(p => p.stock.mikado < 0 || p.stock.kohav < 0).length;

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">מלאי · 2 סניפים</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>מלאי מוצרים</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {fakeTotalCount.toLocaleString('he-IL')} מוצרים פעילים · {negCount} עם מלאי שלילי
          </div>
        </div>
        <div className="row">
          <button className="btn"><IUpload size={16} /> ייבוא CSV</button>
          <button className="btn"><IDownload size={16} /> ייצוא</button>
          <button className="btn btn-primary" onClick={() => onOpen('add')}>
            <IPlus size={16} /> מוצר חדש
          </button>
        </div>
      </div>

      <Card>
        {/* Toolbar */}
        <div style={{
          padding: 14, display: 'flex', gap: 12, alignItems: 'center',
          borderBottom: '1px solid var(--line)', flexWrap: 'wrap'
        }}>
          <div className="search-bar search-with-scan" style={{ maxWidth: 380, margin: 0 }}>
            <ISearch size={15} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="חיפוש לפי שם, ברקוד ראשי או ייבוא מקביל…"
            />
            <button
              className="scan-trigger"
              onClick={onOpenScan}
              title="סריקה במצלמה"
              aria-label="סריקה במצלמה"
            >
              <ICamera size={16} />
            </button>
          </div>

          <div className="chips">
            {CATEGORIES.slice(0, 7).map(c => (
              <button
                key={c.id}
                className={`chip ${cat === c.id ? 'active' : ''}`}
                onClick={() => { setCat(c.id); setPage(1); }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ marginInlineStart: 'auto' }} className="row">
            <select
              className="select"
              value={sup}
              onChange={(e) => { setSup(e.target.value); setPage(1); }}
              style={{ width: 140 }}
            >
              <option value="all">כל הספקים</option>
              {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="select"
              value={stock}
              onChange={(e) => { setStock(e.target.value); setPage(1); }}
              style={{ width: 130 }}
            >
              <option value="all">כל המלאי</option>
              <option value="low">מלאי נמוך</option>
              <option value="negative">מלאי שלילי</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="tbl tbl-inventory">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" /></th>
                <th>מוצר</th>
                <th>ברקוד</th>
                <th>קטגוריה</th>
                <th>ספק</th>
                <th style={{ textAlign: 'end' }}>מחיר צרכן</th>
                <th style={{ textAlign: 'center' }}>
                  <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
                  מיקדו
                </th>
                <th style={{ textAlign: 'center' }}>
                  <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
                  כוכב
                </th>
                <th style={{ textAlign: 'center' }}>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(p => {
                const catLabel = CATEGORIES.find(c => c.id === p.cat)?.label;
                const supName = SUPPLIERS.find(s => s.id === p.supplier)?.name;
                const totalStock = p.stock.mikado + p.stock.kohav + (p.parallel ? p.parallel.stock.mikado + p.parallel.stock.kohav : 0);
                const negative = p.stock.mikado < 0 || p.stock.kohav < 0;
                return (
                  <tr key={p.id} onClick={() => onOpen('detail', p)} className={negative ? 'row-neg' : ''}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                    <td>
                      <div className="row-product">
                        <div className="bottle-thumb">
                          <div className="bottle-thumb-cap" />
                          <div className="bottle-thumb-body" data-cat={p.cat} />
                        </div>
                        <div>
                          <div className="row-product-name">
                            {p.name}
                            {p.parallel && (
                              <span className="parallel-pill" title="ייבוא מקביל">
                                <ISplit size={10} /> מקביל
                              </span>
                            )}
                          </div>
                          <div className="row-product-sku">{catLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono-tiny">{p.sku}</td>
                    <td><Badge tone="accent">{catLabel}</Badge></td>
                    <td>{supName}</td>
                    <td style={{ textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      ₪{p.price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StockCell value={p.stock.mikado} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StockCell value={p.stock.kohav} />
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {totalStock}
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                    לא נמצאו מוצרים. נסה לשנות פילטרים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: 'var(--ink-3)'
        }}>
          <span>
            מוצג {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} מתוך {filtered.length}
            <span className="muted"> · סה״כ במערכת {fakeTotalCount.toLocaleString('he-IL')}</span>
          </span>
          <div className="row">
            <button className="btn btn-sm btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}>
              <IChevronRight size={14} />
            </button>
            <span style={{ padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
              {page} / {totalPages}
            </span>
            <button className="btn btn-sm btn-ghost"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <IChevronLeft size={14} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const StockCell = ({ value }) => {
  let tone = 'ok';
  if (value < 0) tone = 'danger';
  else if (value === 0) tone = 'warn';
  else if (value < 4) tone = 'warn';
  return (
    <span className={`stock-pill stock-${tone}`}>
      {value}
    </span>
  );
};

Object.assign(window, { Inventory });
