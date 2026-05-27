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
  { id: 'daily',     label: 'סיכום יומי',  Icon: ICalendar },
  { id: 'monthly',   label: 'סיכום חודשי', Icon: ITrend },
  { id: 'analysis',  label: 'ניתוח וחריגות', Icon: IPercent },
  { id: 'settings',  label: 'הגדרות',      Icon: ISettings },
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

function App() {
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null);   // { kind, product }
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState('both');
  const [activeSupplier, setActiveSupplier] = useState(null); // for order builder
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
    analysis:  'ניתוח וחריגות',
    settings:  'הגדרות',
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BrandMark /></div>
          <div className="brand-text">
            <div className="brand-name">VinTrack</div>
            <div className="brand-sub">מיקדו · כוכב הצפון</div>
          </div>
        </div>

        {/* Branch switcher */}
        <div className="branch-switch">
          <button className={`branch-opt ${activeBranch === 'both' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('both')}>
            שניהם
          </button>
          <button className={`branch-opt ${activeBranch === 'mikado' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('mikado')}>
            <span className="branch-dot" style={{ background: BRANCHES[0].color }} />
            מיקדו
          </button>
          <button className={`branch-opt ${activeBranch === 'kohav' ? 'active' : ''}`}
                  onClick={() => setActiveBranch('kohav')}>
            <span className="branch-dot" style={{ background: BRANCHES[1].color }} />
            כוכב
          </button>
        </div>

        <div className="nav-group-label">ניווט ראשי</div>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          let badge;
          if (id === 'orders')    badge = ORDERS.filter(o => o.status !== 'completed').length;
          if (id === 'transfers') badge = TRANSFERS.filter(x => x.status === 'pending').length;
          if (id === 'inventory') {
            const neg = PRODUCTS.filter(p => p.stock.mikado < 0 || p.stock.kohav < 0).length;
            badge = neg || undefined;
          }
          return (
            <button key={id}
                    className={`nav-item ${tab === id ? 'active' : ''}`}
                    onClick={() => handleNav(id)}>
              <Icon className="icon" size={18} />
              <span>{label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </button>
          );
        })}

        <div className="nav-group-label">דוחות</div>
        {NAV_SECONDARY.map(({ id, label, Icon }) => (
          <button key={id}
                  className={`nav-item ${tab === id ? 'active' : ''}`}
                  onClick={() => handleNav(id)}>
            <Icon className="icon" size={18} />
            <span>{label}</span>
          </button>
        ))}

        <div className="sidebar-footer">
          <div className="avatar">יא</div>
          <div className="user-info">
            <span className="user-name">יעל אבני</span>
            <span className="user-role">מנהלת</span>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto', width: 28, height: 28 }}>
            <ISettings size={14} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="main" data-screen-label={titles[tab]}>
        <div className="topbar">
          <div>
            <div className="crumbs">VinTrack · {titles[tab]}</div>
          </div>
          <div className="search-bar search-with-scan">
            <ISearch size={15} />
            <input placeholder="חיפוש מוצר, ברקוד, ספק…" />
            <button className="scan-trigger"
                    onClick={() => setScannerOpen(true)}
                    title="סריקה במצלמה">
              <ICamera size={16} />
            </button>
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
            <button className="icon-btn" title="התראות">
              <IBell size={18} />
              <span className="dot" />
            </button>
            <button className="icon-btn" title="הגדרות">
              <ISettings size={18} />
            </button>
          </div>
        </div>

        {tab === 'dashboard' && <Dashboard onNav={handleNav} onOpen={handleOpen} activeBranch={activeBranch} />}
        {tab === 'inventory' && <Inventory onOpen={handleOpen} onOpenScan={() => setScannerOpen(true)} activeBranch={activeBranch} />}
        {tab === 'orders'    && (
          activeSupplier
            ? <OrderBuilder supplierId={activeSupplier} onBack={() => setActiveSupplier(null)} activeBranch={activeBranch} />
            : <SupplierHub onSelectSupplier={(id) => setActiveSupplier(id)} activeBranch={activeBranch} />
        )}
        {tab === 'transfers' && <Transfers activeBranch={activeBranch} />}
        {tab === 'promos'    && <Promotions activeBranch={activeBranch} />}
        {tab === 'daily'     && <Daily activeBranch={activeBranch} />}
        {tab === 'monthly'   && <Monthly activeBranch={activeBranch} />}
        {tab === 'analysis'  && <Analysis activeBranch={activeBranch} />}
        {tab === 'sales'     && <Sales activeBranch={activeBranch} />}
        {tab === 'settings'  && <Settings activeBranch={activeBranch} />}
      </main>

      {/* Modals */}
      {modal?.kind === 'add'    && <AddProductModal onClose={closeModal} />}
      {modal?.kind === 'detail' && <ProductDetailModal product={modal.product} onClose={closeModal} />}
      {modal?.kind === 'order'  && <OrderModal product={modal.product} onClose={closeModal} />}

      {/* Scanner */}
      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onFound={(product) => handleOpen('detail', product)}
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
