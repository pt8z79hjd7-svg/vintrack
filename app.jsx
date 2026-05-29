// === Main App — Wine Store Inventory Management ===
const NAV_ITEMS = [
  { id: 'dashboard', label: 'דשבורד',     Icon: IDashboard },
  { id: 'inventory', label: 'מלאי',       Icon: IBox },
  { id: 'orders',    label: 'הזמנות',     Icon: ITruck },
  { id: 'transfers', label: 'העברות',     Icon: ITransfer },
  { id: 'promos',    label: 'מבצעים',     Icon: ITag },
  { id: 'sales',     label: 'מכירות',     Icon: ICoin },
];
const NAV_SECONDARY = [
  { id: 'daily',        label: 'סיכום יומי',  Icon: ICalendar },
  { id: 'monthly',      label: 'סיכום חודשי', Icon: ITrend },
  { id: 'new-products', label: 'מוצרים חדשים', Icon: IPlus },
  { id: 'analysis',     label: 'ניתוח וחריגות', Icon: IPercent },
  { id: 'settings',     label: 'הגדרות',      Icon: ISettings },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#0d7377",
  "density": "regular",
  "dark": false
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  '#0d7377': { '--accent': 'oklch(0.52 0.09 200)', '--accent-soft': 'oklch(0.95 0.025 200)', '--accent-strong': 'oklch(0.42 0.10 200)' },
  '#7c2d12': { '--accent': 'oklch(0.42 0.13 35)',  '--accent-soft': 'oklch(0.94 0.035 35)',  '--accent-strong': 'oklch(0.34 0.14 30)' },
  '#4f46e5': { '--accent': 'oklch(0.50 0.16 275)', '--accent-soft': 'oklch(0.95 0.035 275)', '--accent-strong': 'oklch(0.42 0.18 275)' },
  '#10905b': { '--accent': 'oklch(0.55 0.13 160)', '--accent-soft': 'oklch(0.95 0.035 160)', '--accent-strong': 'oklch(0.44 0.14 160)' },
  '#374151': { '--accent': 'oklch(0.30 0.01 240)', '--accent-soft': 'oklch(0.93 0.005 240)', '--accent-strong': 'oklch(0.18 0.01 240)' },
};

// ─── פס KPI עליון קבוע — מחזור יומי/חודשי, רווח גולמי, ערך מלאי (בכל מסך) ───
function TopStatsBar({ activeBranch, onNav }) {
  const VAT = 1.18;
  const fmt = window.fmtCurrency || ((v) => `₪${Math.round(v || 0).toLocaleString('he-IL')}`);
  const pickBranch = (o) => activeBranch === 'mikado' ? (o.mikado || 0)
                          : activeBranch === 'kohav'  ? (o.kohav || 0)
                          : (o.total != null ? o.total : o.value) || 0;

  // חודשי נוכחי
  const cur = MONTHLY[MONTHLY.length - 1] || { total: 0, mikado: 0, kohav: 0, profit: 0, margin: 0, m: '' };
  const monthVal = pickBranch(cur);
  const monthProfit = activeBranch === 'both'
    ? (cur.profit || 0)
    : Math.round((cur.profit || 0) * (cur.total ? monthVal / cur.total : 0));

  // יומי — היום אם קיים, אחרת היום האחרון הזמין
  const byDate = window.DAILY_BY_DATE || {};
  const dates = Object.keys(byDate).sort();
  const todayISO = new Date().toISOString().slice(0, 10);
  const dkey = byDate[todayISO] ? todayISO : (dates[dates.length - 1] || '');
  const draw = byDate[dkey] || { total: 0, mikado: 0, kohav: 0 };
  const dayVal = pickBranch(draw);
  const isToday = dkey === todayISO;

  // ערך מלאי נוכחי (לפי עלות)
  const inv = window.INVENTORY_VALUE_TOTAL || { value: 0, mikado: 0, kohav: 0 };
  const invVal = activeBranch === 'mikado' ? (inv.mikado || 0)
               : activeBranch === 'kohav'  ? (inv.kohav || 0)
               : (inv.value || 0);

  const marginOK = (cur.margin || 0) >= 25;

  return (
    <div className="topstats">
      <button className="topstat" onClick={() => onNav('daily')} title="מחזור היום — לחץ לפירוט">
        <div className="topstat-label">מחזור יומי{isToday ? ' · היום' : dkey ? ' · ' + dkey.slice(5) : ''}</div>
        <div className="topstat-value">{fmt(Math.round(dayVal * VAT))}</div>
        <div className="topstat-sub">כולל מע״מ</div>
      </button>
      <button className="topstat" onClick={() => onNav('monthly')} title="מחזור החודש — לחץ לפירוט">
        <div className="topstat-label">מחזור חודשי{cur.m ? ' · ' + cur.m : ''}</div>
        <div className="topstat-value">{fmt(Math.round(monthVal * VAT))}</div>
        <div className="topstat-sub">כולל מע״מ</div>
      </button>
      <button className="topstat topstat-ok" onClick={() => onNav('monthly')} title="רווח גולמי — מחזור פחות עלות מכר">
        <div className="topstat-label">רווח גולמי</div>
        <div className="topstat-value">{fmt(monthProfit)}</div>
        <div className="topstat-sub" style={{ color: marginOK ? 'var(--ok)' : 'var(--warn)' }}>
          מרווח {Number(cur.margin || 0).toFixed(1)}% {marginOK ? '✓' : '· יעד 25%'}
        </div>
      </button>
      <button className="topstat topstat-accent" onClick={() => onNav('inventory')} title="ערך המלאי בחנות לפי עלות">
        <div className="topstat-label">ערך מלאי</div>
        <div className="topstat-value">{fmt(invVal)}</div>
        <div className="topstat-sub">לפי עלות</div>
      </button>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null);   // { kind, product }
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState('both');
  const [activeSupplier, setActiveSupplier] = useState(null); // for order builder
  const [globalQ, setGlobalQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useLiveData();                                   // re-render אוטומטי בכל refreshData
  const lastUpdated = useLastUpdated();            // לסטטוס "עודכן לפני…"
  const [refreshing, setRefreshing] = useState(false);
  const [, tickClock] = useState(0);
  useEffect(() => { const id = setInterval(() => tickClock((n) => n + 1), 30000); return () => clearInterval(id); }, []);
  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await window.refreshData('manual'); } finally { setRefreshing(false); }
  };

  // Apply tweaks
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = t.dark ? 'dark' : 'light';
    root.dataset.density = t.density;
    const preset = ACCENT_PRESETS[t.accent] || ACCENT_PRESETS['#0d7377'];
    Object.entries(preset).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [t.dark, t.density, t.accent]);

  const handleNav = (id) => {
    setTab(id);
    if (id !== 'orders') setActiveSupplier(null);
  };
  const handleOpen = (kind, product) => setModal({ kind, product });
  const closeModal = () => setModal(null);

  const titles = {
    dashboard: 'דשבורד',
    inventory: 'מלאי מוצרים',
    orders:    'הזמנות',
    transfers: 'העברות',
    promos:    'מבצעים',
    sales:     'מוצרים מובילים',
    daily:     'סיכום יומי',
    monthly:   'סיכום חודשי',
    analysis:      'ניתוח וחריגות',
    'new-products': 'מוצרים חדשים',
    settings:      'הגדרות',
  };

  // חישוב badges פעם אחת
  const ordersBadge = ORDERS.filter(o => o.status !== 'completed').length;
  const transfersBadge = TRANSFERS.filter(x => x.status === 'pending').length;
  const negBadge = PRODUCTS.filter(p => p.stock.mikado < 0 || p.stock.kohav < 0).length || undefined;
  const _approved = window.APPROVED_PRODUCTS || new Set();
  const newProdBadge = PRODUCTS.filter(p => !_approved.has(p.sku) && (!p.cost || p.cost <= 0 || !p.price || p.price <= 0)).length;
  const getBadge = (id) => {
    if (id === 'orders') return ordersBadge;
    if (id === 'transfers') return transfersBadge;
    if (id === 'inventory') return negBadge;
    if (id === 'new-products') return newProdBadge;
    return undefined;
  };

  return (
    <div className="app-shell app-shell-v2">
      {/* ─── Header: brand + search + actions ─── */}
      <header className="topbar-v2">
        <div className="topbar-brand">
          <div className="brand-mark"><BrandMark /></div>
          <span className="brand-name">VinTrack</span>
        </div>

        <div className="branch-switch branch-switch-top">
          <button className={`branch-opt ${activeBranch === 'both' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('both')}>שניהם</button>
          <button className={`branch-opt ${activeBranch === 'mikado' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('mikado')}>
            <span className="branch-dot" style={{ background: BRANCHES[0].color }} />מיקדו
          </button>
          <button className={`branch-opt ${activeBranch === 'kohav' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('kohav')}>
            <span className="branch-dot" style={{ background: BRANCHES[1].color }} />כוכב
          </button>
        </div>

        <div className="search-bar search-with-scan" style={{ position: 'relative' }}>
          <ISearch size={15} />
          <input placeholder="חיפוש מוצר, ברקוד, ספק…" value={globalQ}
                 onChange={(e) => setGlobalQ(e.target.value)}
                 onFocus={() => setSearchFocused(true)}
                 onBlur={() => setTimeout(() => setSearchFocused(false), 200)} />
          <button className="scan-trigger" onClick={() => setScannerOpen(true)} title="סריקה במצלמה">
            <ICamera size={16} />
          </button>
          {searchFocused && globalQ.length >= 2 && (() => {
            const q = globalQ.toLowerCase();
            const hits = PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.sku.includes(globalQ) || p.supplier.toLowerCase().includes(q)).slice(0, 8);
            if (!hits.length) return (
              <div className="search-dropdown"><div style={{ padding: '12px 16px', color: 'var(--ink-3)', fontSize: 13 }}>לא נמצא</div></div>
            );
            return (
              <div className="search-dropdown">
                {hits.map(p => (
                  <div key={p.id} className="search-hit" onMouseDown={() => { handleOpen('detail', p); setGlobalQ(''); }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.supplier} · {p.sku} · מלאי: {p.stock.mikado + p.stock.kohav}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="topbar-actions">
          <span className="muted" title={`עודכן ב-${new Date(lastUpdated).toLocaleTimeString('he-IL')}`}
                style={{ fontSize: 12, marginInlineEnd: 6, whiteSpace: 'nowrap' }}>
            {refreshing ? 'מעדכן…' : `עודכן ${relTime(lastUpdated)}`}
          </span>
          <button className="icon-btn" title="רענן עכשיו" onClick={doRefresh} disabled={refreshing}
                  style={{ opacity: refreshing ? 0.5 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button className="icon-btn" title="התראות"><IBell size={18} /><span className="dot" /></button>
          <button className="icon-btn" title="הגדרות" onClick={() => handleNav('settings')}><ISettings size={18} /></button>
        </div>
      </header>

      {/* ─── פס KPI עליון קבוע (בכל המסכים) ─── */}
      <TopStatsBar activeBranch={activeBranch} onNav={handleNav} />

      {/* ─── Nav strip: primary + secondary tabs ─── */}
      <nav className="nav-strip">
        <div className="nav-strip-row">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const badge = getBadge(id);
            return (
              <button key={id} className={`nav-tab ${tab === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
                <Icon className="icon" size={16} />
                <span>{label}</span>
                {badge ? <span className="badge">{badge}</span> : null}
              </button>
            );
          })}
          <span className="nav-divider" />
          {NAV_SECONDARY.map(({ id, label, Icon }) => {
            const badge = getBadge(id);
            return (
              <button key={id} className={`nav-tab nav-tab-sec ${tab === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
                <Icon className="icon" size={16} />
                <span>{label}</span>
                {badge ? <span className="badge warn">{badge}</span> : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Content area ─── */}
      <main className="main-v2" data-screen-label={titles[tab]}>

        {tab === 'dashboard' && <Dashboard onNav={handleNav} onOpen={handleOpen} activeBranch={activeBranch} />}
        {tab === 'inventory' && <Inventory onOpen={handleOpen} onOpenScan={() => setScannerOpen(true)} activeBranch={activeBranch} />}
        {tab === 'orders'    && (
          activeSupplier
            ? <OrderBuilder supplierId={activeSupplier} onBack={() => setActiveSupplier(null)} activeBranch={activeBranch} />
            : <SupplierHub onSelectSupplier={(id) => setActiveSupplier(id)} activeBranch={activeBranch} />
        )}
        {tab === 'transfers' && <Transfers activeBranch={activeBranch} onOpen={handleOpen} />}
        {tab === 'promos'    && <Promotions activeBranch={activeBranch} />}
        {tab === 'daily'     && <Daily activeBranch={activeBranch} onOpen={handleOpen} />}
        {tab === 'monthly'   && <Monthly activeBranch={activeBranch} />}
        {tab === 'analysis'      && <Analysis activeBranch={activeBranch} onOpen={handleOpen} />}
        {tab === 'sales'         && <Sales activeBranch={activeBranch} onOpen={handleOpen} />}
        {tab === 'new-products'  && <NewProducts onOpen={handleOpen} activeBranch={activeBranch} />}
        {tab === 'settings'  && <Settings activeBranch={activeBranch} />}
      </main>

      {/* ─── Bottom nav (mobile only — secondary tabs) ─── */}
      <nav className="nav-bottom">
        {NAV_SECONDARY.map(({ id, label, Icon }) => {
          const badge = getBadge(id);
          return (
            <button key={id} className={`nav-bottom-item ${tab === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {modal?.kind === 'add'    && <AddProductModal onClose={closeModal} initialBarcode={modal.barcode || ''} />}
      {modal?.kind === 'detail' && <ProductDetailModal product={modal.product} onClose={closeModal} />}
      {modal?.kind === 'order'  && <OrderModal product={modal.product} onClose={closeModal} />}

      {/* Scanner */}
      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onFound={(product) => handleOpen('detail', product)}
          onAdd={(barcode) => setModal({ kind: 'add', barcode })}
        />
      )}

      {/* Tweaks Panel */}
      <TweaksPanel>
        <TweakSection label="צבע" />
        <TweakColor
          label="אקסנט"
          value={t.accent}
          onChange={(v) => setTweak('accent', v)}
          options={['#0d7377', '#7c2d12', '#4f46e5', '#10905b', '#374151']}
        />

        <TweakSection label="תצוגה" />
        <TweakRadio
          label="צפיפות"
          value={t.density}
          onChange={(v) => setTweak('density', v)}
          options={[
            { value: 'compact', label: 'צפוף' },
            { value: 'regular', label: 'רגיל' },
            { value: 'cozy',    label: 'מרווח' },
          ]}
        />
        <TweakToggle
          label="מצב כהה"
          value={t.dark}
          onChange={(v) => setTweak('dark', v)}
        />

        <TweakSection label="פעולות מהירות" />
        <TweakButton label="פתח סורק ברקוד" onClick={() => setScannerOpen(true)} />
        <TweakButton label="פתח מוצר עם ייבוא מקביל" onClick={() => handleOpen('detail', PRODUCTS.find(p => p.parallel))} />
        <TweakButton label="פתח מוצר רגיל" onClick={() => handleOpen('detail', PRODUCTS[0])} />
        <TweakButton label="הוספת מוצר חדש" onClick={() => handleOpen('add')} />
      </TweaksPanel>
    </div>
  );
}

const BrandMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3h8" />
    <path d="M9 3v5a3 3 0 0 0 6 0V3" />
    <path d="M12 11v10" />
    <path d="M8 21h8" />
  </svg>
);

window.App = App;   // הרינדור מתבצע ב-boot.jsx (אחרי התחברות + טעינת נתונים)
