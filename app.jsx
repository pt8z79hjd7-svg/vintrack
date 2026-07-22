// === Main App — Wine Store Inventory Management ===
// ניווט hub-and-spoke: 5 מרכזים, כל אחד עם תת-טאבים. מחליף 12 טאבים שטוחים.
const NAV_HUBS = [
  { id: 'home',      label: 'בית',     Icon: IDashboard, subs: [
    { id: 'overview', label: 'סקירה', Icon: IDashboard },
    { id: 'daily',    label: 'יומי',  Icon: ICalendar },
  ] },
  { id: 'inventory', label: 'מלאי',    Icon: IBox, subs: [
    { id: 'stock',    label: 'מלאי',          Icon: IBox },
    { id: 'new',      label: 'מוצרים חדשים',  Icon: IPlus },
    { id: 'analysis', label: 'ניתוח',         Icon: IPercent },
    { id: 'dead',     label: 'מלאי מת',       Icon: ITag },
  ] },
  { id: 'ops',       label: 'תפעול',   Icon: ITruck, subs: [
    { id: 'orders',    label: 'הזמנות',  Icon: ITruck },
    { id: 'transfers', label: 'העברות',  Icon: ITransfer },
    { id: 'promos',    label: 'מבצעים',  Icon: ITag },
  ] },
  { id: 'insights',  label: 'תובנות',  Icon: ITrend, subs: [
    { id: 'monthly',   label: 'חודשי',   Icon: ITrend },
    { id: 'sales',     label: 'מכירות',  Icon: ICoin },
    { id: 'employees', label: 'עובדים',  Icon: IUsers },
  ] },
  { id: 'settings',  label: 'הגדרות',  Icon: ISettings, subs: [
    { id: 'settings', label: 'הגדרות', Icon: ISettings },
  ] },
];
// מיפוי id-ישן (deep-links מ-TopStatsBar/dashboard/summary) → {hub, sub}. שומר שכל ניווט קיים עובד.
const NAV_ALIAS = {
  dashboard:        { hub: 'home',      sub: 'overview' },
  daily:            { hub: 'home',      sub: 'daily' },
  inventory:        { hub: 'inventory', sub: 'stock' },
  'new-products':   { hub: 'inventory', sub: 'new' },
  analysis:         { hub: 'inventory', sub: 'analysis' },
  'dead-stock':     { hub: 'inventory', sub: 'dead' },
  orders:           { hub: 'ops',       sub: 'orders' },
  transfers:        { hub: 'ops',       sub: 'transfers' },
  promos:           { hub: 'ops',       sub: 'promos' },
  monthly:          { hub: 'insights',  sub: 'monthly' },
  sales:            { hub: 'insights',  sub: 'sales' },
  'employee-sales': { hub: 'insights',  sub: 'employees' },
  settings:         { hub: 'settings',  sub: 'settings' },
};
const HUB_IDS = new Set(NAV_HUBS.map(h => h.id));
const HUB_DEFAULT_SUB = Object.fromEntries(NAV_HUBS.map(h => [h.id, h.subs[0].id]));

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

  const profitTarget = (window.SETTINGS && Number(window.SETTINGS.profitTarget)) || 25;
  const marginOK = (cur.margin || 0) >= profitTarget;

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
      <button className="topstat topstat-ok" onClick={() => onNav('monthly')} title="רווח גולמי — מחזור פחות עלות מכר (ללא מע״מ)">
        <div className="topstat-label">רווח גולמי</div>
        <div className="topstat-value">{fmt(monthProfit)}</div>
        <div className="topstat-sub" style={{ color: marginOK ? 'var(--ok)' : 'var(--warn)' }}>
          מרווח {Number(cur.margin || 0).toFixed(1)}% {marginOK ? '✓' : '· יעד ' + profitTarget + '%'} · ללא מע״מ
        </div>
      </button>
      <button className="topstat topstat-accent" onClick={() => onNav('inventory')}
        title={`ערך המלאי לפי עלות. ${window.vatLabelOpp ? window.vatLabelOpp() : 'ללא מע״מ'}: ${fmt(Math.round(invVal * (window.vatMultOpp ? window.vatMultOpp() : 1)))} — לחץ לחלוקה לפי סניפים`}>
        <div className="topstat-label">ערך מלאי</div>
        <div className="topstat-value">{fmt(Math.round(invVal * (window.vatMult ? window.vatMult() : 1.18)))}</div>
        <div className="topstat-sub">לפי עלות · {window.vatLabel ? window.vatLabel() : 'כולל מע״מ'}</div>
      </button>
    </div>
  );
}

function App() {
  const [hub, setHub] = useState('home');
  const [subByHub, setSubByHub] = useState({ ...HUB_DEFAULT_SUB });
  const sub = subByHub[hub];
  const [modal, setModal] = useState(null);   // { kind, product }
  const [scannerOpen, setScannerOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);   // A5: כפתור פעולה צף (מובייל)
  const [activeBranch, setActiveBranch] = useState('both');
  const [activeSupplier, setActiveSupplier] = useState(null); // for order builder
  const [globalQ, setGlobalQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useLiveData();                                   // re-render אוטומטי בכל refreshData
  const lastUpdated = useLastUpdated();            // מתי האפליקציה משכה (זמן-משיכה)
  const dataSync = useDataSync();                  // מתי הצינור דחף נתונים (גיל-נתונים אמיתי)
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // טריגר סנכרון מיידי עם הקופה (Pipeline Python במחשב הבעלים)
  const requestSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { error } = await window.sb.from('pipeline_triggers').insert({
        requested_by: 'app',
        status: 'pending'
      });
      if (error) {
        window.toast?.err?.(`שגיאה: ${error.message}`, 4000);
        setSyncing(false);
        return;
      }
      window.toast?.info?.('🔔 בקשת סנכרון נשלחה — נתונים טריים תוך 30-60 שניות', 5000);
      // poll: כל 10 ש' עד 90 ש' — אם dataSync מתעדכן, מודיע
      const startSync = window.LAST_DATA_SYNC || 0;
      let polls = 0;
      const iv = setInterval(async () => {
        polls++;
        await window.refreshData?.('sync-poll');
        const now = window.LAST_DATA_SYNC || 0;
        if (now > startSync) {
          window.toast?.ok?.('✓ נתונים עדכניים מהקופה', 3000);
          clearInterval(iv);
          setSyncing(false);
        } else if (polls >= 9) {  // 90 שניות
          window.toast?.warn?.('⏳ הסנכרון לוקח יותר זמן מהצפוי — בדוק שוב בעוד דקה', 5000);
          clearInterval(iv);
          setSyncing(false);
        }
      }, 10000);
    } catch (e) {
      window.toast?.err?.(`שגיאה: ${String(e).slice(0, 100)}`, 4000);
      setSyncing(false);
    }
  };
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

  // קולט hub-id (קליק על מרכז) או leaf-id ישן (deep-link) דרך NAV_ALIAS.
  const handleNav = (id) => {
    let targetHub, targetSub;
    if (HUB_IDS.has(id)) { targetHub = id; targetSub = null; }       // null = שמור תת-טאב אחרון
    else if (NAV_ALIAS[id]) { targetHub = NAV_ALIAS[id].hub; targetSub = NAV_ALIAS[id].sub; }
    else return;
    setHub(targetHub);
    if (targetSub) setSubByHub(prev => prev[targetHub] === targetSub ? prev : { ...prev, [targetHub]: targetSub });
    const landingSub = targetSub || subByHub[targetHub];
    if (!(targetHub === 'ops' && landingSub === 'orders')) setActiveSupplier(null);
    window.refreshOnNav && window.refreshOnNav();   // רענון נתונים בכל מעבר דף/האב
  };
  // קליק על תת-טאב בתוך ה-hub הפעיל.
  const selectSub = (subId) => {
    setSubByHub(prev => prev[hub] === subId ? prev : { ...prev, [hub]: subId });
    if (!(hub === 'ops' && subId === 'orders')) setActiveSupplier(null);
    window.refreshOnNav && window.refreshOnNav();   // רענון נתונים בכל מעבר תת-טאב
  };
  // ניווט גלובלי — לרכיבים עמוקים שלא מקבלים onNav (למשל DailyExpanded → הגדרות). בלי deps → תמיד טרי.
  useEffect(() => { window.vintrackNav = handleNav; });
  const handleOpen = (kind, product) => setModal({ kind, product });
  const closeModal = () => setModal(null);

  // תווית מסך פעיל (data-screen-label) — מתוך התת-טאב הפעיל.
  const activeHub = NAV_HUBS.find(h => h.id === hub) || NAV_HUBS[0];
  const activeSubObj = activeHub.subs.find(s => s.id === sub) || activeHub.subs[0];
  const screenLabel = activeSubObj ? activeSubObj.label : activeHub.label;

  // חישוב badges פעם אחת
  const ordersBadge = ORDERS.filter(o => o.status !== 'completed').length;
  const transfersBadge = TRANSFERS.filter(x => x.status === 'pending').length;
  const negBadge = PRODUCTS.filter(p => p.stock.mikado < 0 || p.stock.kohav < 0).length || undefined;
  const _approved = window.APPROVED_PRODUCTS || new Set();
  const newProdBadge = PRODUCTS.filter(p => !_approved.has(p.sku) && (!p.cost || p.cost <= 0 || !p.price || p.price <= 0)).length;
  // badge לפי תת-טאב; badge ל-hub = סכום הילדים (bubbling — שומר התראה במבט-על).
  const subBadgeOf = (hubId, subId) => {
    if (hubId === 'ops' && subId === 'orders') return ordersBadge || undefined;
    if (hubId === 'ops' && subId === 'transfers') return transfersBadge || undefined;
    if (hubId === 'inventory' && subId === 'stock') return negBadge || undefined;
    if (hubId === 'inventory' && subId === 'new') return newProdBadge || undefined;
    return undefined;
  };
  const hubBadgeOf = (hubId) => {
    const h = NAV_HUBS.find(x => x.id === hubId);
    const total = h ? h.subs.reduce((s, sb) => s + (subBadgeOf(hubId, sb.id) || 0), 0) : 0;
    return total || undefined;
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
          {(() => {
            const now = Date.now();
            const hr = new Date(now).getHours();
            const stale = dataSync && hr >= 9 && hr < 23 && (now - dataSync > 25 * 60000);
            const syncTxt = dataSync
              ? new Date(dataSync).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
              : '—';
            const tip = `נתונים מהצינור: ${syncTxt} · רענון אפליקציה: ${new Date(lastUpdated).toLocaleTimeString('he-IL')}`
              + (stale ? ' · ⚠ הנתונים לא התרעננו — ייתכן שהמחשב כבוי/ישן או שהצינור תקוע' : '');
            const label = refreshing
              ? 'מעדכן…'
              : (dataSync ? `נתונים ${relTime(dataSync)}` : `רוענן ${relTime(lastUpdated)}`);
            return (
              <span className="muted" title={tip}
                    style={{ fontSize: 12, marginInlineEnd: 6, whiteSpace: 'nowrap',
                             color: stale ? '#d97706' : undefined }}>
                {label}{stale ? ' ⚠' : ''}
              </span>
            );
          })()}
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
          <button className="icon-btn" title="סנכרן עכשיו עם הקופה (מוריד נתונים טריים)"
                  onClick={requestSync} disabled={syncing}
                  style={{ opacity: syncing ? 0.5 : 1, color: syncing ? 'var(--warn)' : 'var(--accent-strong)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button className="icon-btn" title="התראות"><IBell size={18} /><span className="dot" /></button>
          <button className="icon-btn" title="הגדרות" onClick={() => handleNav('settings')}><ISettings size={18} /></button>
        </div>
      </header>

      {/* ─── פס KPI עליון קבוע (בכל המסכים) ─── */}
      <TopStatsBar activeBranch={activeBranch} onNav={handleNav} />

      {/* ─── Nav strip: hubs row + sub-tabs pills ─── */}
      <nav className="nav-strip">
        <div className="nav-strip-row">
          {NAV_HUBS.map(({ id, label, Icon }) => {
            const badge = hubBadgeOf(id);
            return (
              <button key={id} className={`nav-tab ${hub === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
                <Icon className="icon" size={16} />
                <span>{label}</span>
                {badge ? <span className="badge">{badge}</span> : null}
              </button>
            );
          })}
        </div>
        {activeHub.subs.length > 1 && (
          <div className="nav-subtabs">
            {activeHub.subs.map(({ id, label, Icon }) => {
              const badge = subBadgeOf(hub, id);
              return (
                <button key={id} className={`subtab ${sub === id ? 'active' : ''}`} onClick={() => selectSub(id)}>
                  <Icon size={14} />
                  <span>{label}</span>
                  {badge ? <span className="badge">{badge}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* ─── Content area (hub → sub) ─── */}
      <main className="main-v2" data-screen-label={screenLabel}>

        {hub === 'home' && sub === 'overview' && <Dashboard onNav={handleNav} onOpen={handleOpen} activeBranch={activeBranch} />}
        {hub === 'home' && sub === 'daily'    && <Daily activeBranch={activeBranch} onOpen={handleOpen} />}

        {hub === 'inventory' && sub === 'stock'    && <Inventory onOpen={handleOpen} onOpenScan={() => setScannerOpen(true)} activeBranch={activeBranch} />}
        {hub === 'inventory' && sub === 'new'      && <NewProducts onOpen={handleOpen} activeBranch={activeBranch} />}
        {hub === 'inventory' && sub === 'analysis' && <Analysis activeBranch={activeBranch} onOpen={handleOpen} />}
        {hub === 'inventory' && sub === 'dead' && <DeadStock activeBranch={activeBranch} onOpen={handleOpen} />}

        {hub === 'ops' && sub === 'orders' && (
          activeSupplier
            ? <OrderBuilder supplierId={activeSupplier} onBack={() => setActiveSupplier(null)} activeBranch={activeBranch} />
            : <SupplierHub onSelectSupplier={(id) => setActiveSupplier(id)} activeBranch={activeBranch} />
        )}
        {hub === 'ops' && sub === 'transfers' && <Transfers activeBranch={activeBranch} onOpen={handleOpen} />}
        {hub === 'ops' && sub === 'promos'    && <Promotions activeBranch={activeBranch} />}

        {hub === 'insights' && sub === 'monthly'   && <Monthly activeBranch={activeBranch} />}
        {hub === 'insights' && sub === 'sales'     && <Sales activeBranch={activeBranch} onOpen={handleOpen} />}
        {hub === 'insights' && sub === 'employees' && <EmployeeSales activeBranch={activeBranch} />}

        {hub === 'settings' && <Settings activeBranch={activeBranch} />}
      </main>

      {/* ─── Bottom nav (mobile only — 5 hubs) ─── */}
      <nav className="nav-bottom">
        {NAV_HUBS.map(({ id, label, Icon }) => {
          const badge = hubBadgeOf(id);
          return (
            <button key={id} className={`nav-bottom-item ${hub === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </button>
          );
        })}
      </nav>

      {/* A5: כפתור פעולה צף — מובייל בלבד (CSS), 3 פעולות מהירות */}
      <div className="fab-wrap">
        {fabOpen && (
          <div className="fab-menu">
            <button onClick={() => { setFabOpen(false); setScannerOpen(true); }}>📷 סריקת ברקוד</button>
            <button onClick={() => { setFabOpen(false); handleNav('orders'); }}>🛒 הזמנה חדשה</button>
            <button onClick={() => { setFabOpen(false); handleNav('transfers'); }}>🔄 העברה</button>
          </div>
        )}
        <button className="fab" onClick={() => setFabOpen(o => !o)} title="פעולות מהירות">
          {fabOpen ? '✕' : '+'}
        </button>
      </div>

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
