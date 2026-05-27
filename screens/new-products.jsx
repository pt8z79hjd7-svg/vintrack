// === New Products — products missing prices + recently added ===
const NewProducts = ({ onOpen, activeBranch = 'both' }) => {
  useLiveData();
  const [filter, setFilter] = useState('all');  // all | missing_cost | missing_price | new
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created');  // created | name | supplier

  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // classify products
  const classified = PRODUCTS.map(p => {
    const missingCost = !p.cost || p.cost <= 0;
    const missingPrice = !p.price || p.price <= 0;
    const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
    const isNew = createdMs > now - WEEK_MS;
    const needsAttention = missingCost || missingPrice || isNew;
    return { ...p, missingCost, missingPrice, isNew, createdMs, needsAttention };
  });

  // filter
  let items = classified.filter(p => p.needsAttention);
  if (filter === 'missing_cost') items = items.filter(p => p.missingCost);
  if (filter === 'missing_price') items = items.filter(p => p.missingPrice);
  if (filter === 'new') items = items.filter(p => p.isNew);

  // search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.includes(q) || p.supplier.toLowerCase().includes(q));
  }

  // sort
  items.sort((a, b) => {
    if (sort === 'created') return b.createdMs - a.createdMs;
    if (sort === 'name') return a.name.localeCompare(b.name, 'he');
    if (sort === 'supplier') return a.supplier.localeCompare(b.supplier, 'he');
    return 0;
  });

  // counts
  const countAll = classified.filter(p => p.needsAttention).length;
  const countMissingCost = classified.filter(p => p.missingCost).length;
  const countMissingPrice = classified.filter(p => p.missingPrice).length;
  const countNew = classified.filter(p => p.isNew).length;

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

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">ניהול מלאי</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>
            מוצרים חדשים וחסרי מחיר
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {countAll} מוצרים דורשים תשומת לב · {countMissingCost} ללא עלות · {countMissingPrice} ללא מחיר מכירה · {countNew} חדשים (7 ימים)
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {[
          ['all', `הכל (${countAll})`, ''],
          ['missing_cost', `ללא עלות (${countMissingCost})`, 'warn'],
          ['missing_price', `ללא מחיר מכירה (${countMissingPrice})`, 'warn'],
          ['new', `חדשים (${countNew})`, 'accent'],
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
                <th>ברקוד</th>
                <th>ספק</th>
                <th style={{ textAlign: 'end' }}>עלות</th>
                <th style={{ textAlign: 'end' }}>מחיר מכירה</th>
                <th style={{ textAlign: 'end' }}>מלאי</th>
                <th>נוסף</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                    {search ? 'אין תוצאות לחיפוש.' : 'אין מוצרים דורשים תשומת לב.'}
                  </td>
                </tr>
              ) : items.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onOpen('detail', p)}>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {p.isNew && <span className="badge accent" style={{ fontSize: 10 }}>חדש</span>}
                      {p.missingCost && <span className="badge warn" style={{ fontSize: 10 }}>ללא עלות</span>}
                      {p.missingPrice && <span className="badge warn" style={{ fontSize: 10 }}>ללא מחיר</span>}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink-3)' }}>{p.sku}</td>
                  <td>{p.supplier}</td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: p.missingCost ? 'var(--danger)' : '' }}>
                    {fmtCurrency(p.cost)}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: p.missingPrice ? 'var(--danger)' : '' }}>
                    {fmtCurrency(p.price)}
                  </td>
                  <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{stockVal(p)}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtDate(p.created_at)}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen('detail', p); }}>
                      ערוך
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
