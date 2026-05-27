// === טעינת נתונים חיים מ-Supabase והתאמתם לשמות שהמסכים מצפים להם ===
// מחליף את data.jsx (הדמה). window.loadAllData() נקרא אחרי התחברות, לפני הרינדור.

const CATMAP = {
  'יין אדום': 'red', 'יין לבן': 'white', 'יין רוזה': 'rose', 'שמפניה': 'sparkle',
  'ויסקי': 'whisky', 'וודקה': 'vodka', "ג'ין": 'gin', 'רום': 'rum',
  'טקילה': 'tequila', 'ליקר': 'liqueur', 'בירה': 'beer', 'אחר': 'other',
};
const HEB_MON = { '01':'ינו','02':'פבר','03':'מרץ','04':'אפר','05':'מאי','06':'יונ',
                  '07':'יול','08':'אוג','09':'ספט','10':'אוק','11':'נוב','12':'דצמ' };
const mlabel = (m) => { const [y, mo] = String(m || '').split('-'); return `${HEB_MON[mo] || mo} ${y || ''}`.trim(); };
const n = (x) => Number(x) || 0;

// אתחול גלובלים ריקים — כדי שאף מסך לא יקרוס לפני שהנתונים נטענים
Object.assign(window, {
  BRANCHES: [
    { id: 'mikado', name: 'מיקדו', color: 'oklch(0.52 0.10 220)' },
    { id: 'kohav', name: 'כוכב הצפון', color: 'oklch(0.62 0.14 60)' },
  ],
  CATEGORIES: [{ id: 'all', label: 'הכל' }], SUPPLIERS: [], PRODUCTS: [],
  MONTHLY: [], DAILY_SAMPLE: {}, DAILY_BY_DATE: {}, ORDERS: [], TRANSFERS: [], PROMOTIONS: [],
  ACTIVITY: [], INVENTORY_VALUE_BY_MONTH: [], PAST_ORDERS: {}, LAST_RECEIVED: {},
});

async function loadAllData() {
  const sb = window.sb;
  const [prodR, monR, dayR, invR, dealR, transR, ordR] = await Promise.all([
    sb.from('products').select('*').limit(5000),
    sb.from('monthly_summary').select('*'),
    sb.from('daily_summary').select('*').order('summary_date', { ascending: false }),
    sb.from('supplier_inventory').select('*'),
    sb.from('import_deals').select('*'),
    sb.from('transfers').select('*'),
    sb.from('order_recommendations').select('*'),
  ]);
  const products = prodR.data || [];

  const BRANCHES = [
    { id: 'mikado', name: 'מיקדו', color: 'oklch(0.52 0.10 220)' },
    { id: 'kohav', name: 'כוכב הצפון', color: 'oklch(0.62 0.14 60)' },
  ];

  const PRODUCTS = products.map((p) => ({
    id: p.barcode || p.id,
    sku: p.barcode || '',
    name: p.name,
    cat: CATMAP[p.category] || 'other',
    catLabel: p.category || 'אחר',
    supplier: p.supplier || 'לא ידוע',
    cost: n(p.cost_price),
    price: n(p.sell_price),
    stock: { mikado: n(p.stock_mikado), kohav: n(p.stock_kochav) },
    total: n(p.stock_mikado) + n(p.stock_kochav),
    parallel: p.has_parallel ? {
      sku: p.parallel_barcode || '', supplier: p.parallel_supplier || '',
      cost: n(p.parallel_cost),
      stock: { mikado: n(p.parallel_stock_mikado), kohav: n(p.parallel_stock_kochav) },
    } : null,
    extra: p.extra_barcodes || [],
    weekly: n(p.weekly_velocity),
    margin: n(p.profit_margin),
    is_promo: !!p.is_promo,
    min_stock: n(p.min_stock),
    effective_sell_price: p.effective_sell_price != null ? n(p.effective_sell_price) : null,
    updated: '',
  }));

  // קטגוריות (לפי הקיימות בפועל)
  const seenCat = {};
  const CATEGORIES = [{ id: 'all', label: 'הכל' }];
  products.forEach((p) => {
    const id = CATMAP[p.category] || 'other';
    if (p.category && !seenCat[id]) { seenCat[id] = 1; CATEGORIES.push({ id, label: p.category }); }
  });

  // ספקים (id = שם)
  const supCount = {};
  products.forEach((p) => { if (p.supplier) supCount[p.supplier] = (supCount[p.supplier] || 0) + 1; });
  const SUPPLIERS = Object.keys(supCount).map((s) => ({ id: s, name: s, lead: '', items: supCount[s] }));

  // חודשי
  const curMonth = new Date().toISOString().slice(0, 7);
  const MONTHLY = (monR.data || [])
    .sort((a, b) => String(a.month).localeCompare(String(b.month)))
    .map((r) => ({
      m: mlabel(r.month), total: n(r.revenue_total), mikado: n(r.revenue_mikado), kohav: n(r.revenue_kochav),
      profit: n(r.profit_est), margin: n(r.margin_pct), days: n(r.days_active),
      extra: n(r.additional_income), current: r.month === curMonth,
    }));

  // יומי — כל הימים, לבחירה לפי תאריך
  const dailyRows = dayR.data || [];
  const mkDay = (r) => ({
    date: r.summary_date || '', total: n(r.revenue_total), mikado: n(r.revenue_mikado),
    kohav: n(r.revenue_kochav), profit: n(r.profit_est), margin: n(r.margin_pct),
    salesLines: n(r.sales_lines), lines: [],
  });
  const DAILY_BY_DATE = {};
  dailyRows.forEach((r) => { if (r.summary_date) DAILY_BY_DATE[r.summary_date] = mkDay(r); });
  const DAILY_SAMPLE = dailyRows[0] ? mkDay(dailyRows[0])
    : { date: '', total: 0, mikado: 0, kohav: 0, profit: 0, margin: 0, salesLines: 0, lines: [] };

  // שווי מלאי לפי ספק/חודש
  const invMap = {};
  (invR.data || []).forEach((r) => {
    if (!invMap[r.month]) invMap[r.month] = { m: mlabel(r.month), values: {} };
    invMap[r.month].values[r.supplier] = n(r.value);
  });
  const INVENTORY_VALUE_BY_MONTH = Object.keys(invMap).sort().map((k) => invMap[k]);

  // מבצעים
  const PROMOTIONS = (dealR.data || []).map((d) => ({
    supplier: d.supplier || '', title: d.title || d.product_name || '', ends: d.valid_until || '',
    items: 0, barcode: d.barcode || '',
    discount: (d.regular_cost && d.deal_cost) ? Math.round((1 - d.deal_cost / d.regular_cost) * 100) : 0,
    type: 'category',
  }));

  // העברות
  const stMap = { 'ממתין': 'pending', 'בוצע': 'completed', 'בוטל': 'cancelled' };
  const TRANSFERS = (transR.data || []).map((t, i) => ({
    id: 'T-' + (i + 1), from: t.from_branch === 'מיקדו' ? 'mikado' : 'kohav',
    to: t.to_branch === 'מיקדו' ? 'mikado' : 'kohav', items: 1, units: n(t.quantity),
    status: stMap[t.status] || 'pending', tone: t.status === 'בוצע' ? 'ok' : 'warn',
    date: '', user: '', name: t.product_name,
  }));

  // הזמנות (קיבוץ המלצות לפי ספק)
  const ordBySup = {};
  (ordR.data || []).forEach((o) => { (ordBySup[o.supplier] = ordBySup[o.supplier] || []).push(o); });
  const ORDERS = Object.keys(ordBySup).map((sup, i) => ({
    id: '#' + (5100 + i), supplier: sup, branch: 'both', date: '', eta: '',
    items: ordBySup[sup].length, sum: 0, status: 'pending', tone: 'warn',
  }));

  Object.assign(window, {
    BRANCHES, CATEGORIES, SUPPLIERS, PRODUCTS, MONTHLY, DAILY_SAMPLE, DAILY_BY_DATE,
    ORDERS, TRANSFERS, PROMOTIONS, ACTIVITY: [], INVENTORY_VALUE_BY_MONTH,
    PAST_ORDERS: {}, LAST_RECEIVED: {},
    LAST_REFRESH: Date.now(),  // מתי הנתון נטען מסופאבייס (לתצוגת "עודכן לפני X")
  });
}

window.loadAllData = loadAllData;

// ─── רענון אוטומטי: בכל חזרה לטאב + ברקע כל 90 שניות + Supabase realtime ───
// כל אלה מעדכנים את window.PRODUCTS/MONTHLY/DAILY וכו'. הקומפוננטות
// משתמשות בהם דרך גישה ישירה ל-window, אבל כדי לרענן UI גם בלי re-render
// טבעי — אנחנו מפעילים אירוע 'vintrack:data-updated' שקומפוננטות יכולות להאזין.
let _refreshing = false;
async function refreshData(reason = 'manual') {
  if (_refreshing) return;
  _refreshing = true;
  window.dispatchEvent(new CustomEvent('vintrack:refresh-start', { detail: { reason, at: Date.now() } }));
  try {
    await loadAllData();
    window.dispatchEvent(new CustomEvent('vintrack:data-updated', { detail: { reason, at: Date.now() } }));
    console.log('[VinTrack] רענון נתונים:', reason);
  } catch (e) {
    console.warn('[VinTrack] רענון נכשל:', e?.message);
    window.dispatchEvent(new CustomEvent('vintrack:refresh-error', { detail: { reason, message: e?.message || 'unknown' } }));
  } finally {
    _refreshing = false;
  }
}
window.refreshData = refreshData;

// 1) חזרה לטאב = רענון (אם עברו לפחות 20 שניות מהטעינה האחרונה)
let _lastLoadAt = Date.now();
window.addEventListener('vintrack:data-updated', () => { _lastLoadAt = Date.now(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - _lastLoadAt > 20000) {
    refreshData('visibilitychange');
  }
});
// פוקוס לחלון (קליק חזרה מהדפדפן) — אותו דבר
window.addEventListener('focus', () => {
  if (Date.now() - _lastLoadAt > 20000) refreshData('focus');
});

// 2) רענון רקע כל 90 שניות (רק כשהטאב גלוי)
setInterval(() => {
  if (document.visibilityState === 'visible') refreshData('interval');
}, 90000);

// 3) Supabase realtime — אם הטבלאות משתנות בצד שרת, נקבל דחיפה ונרענן מיד
function startRealtime() {
  try {
    if (!window.sb) return;
    const tables = ['products', 'daily_summary', 'monthly_summary', 'supplier_inventory',
                    'order_recommendations', 'transfers', 'import_deals'];
    const ch = window.sb.channel('vintrack-live');
    tables.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t },
                                () => refreshData('realtime:' + t)));
    ch.subscribe();
    window._vtChannel = ch;
  } catch (e) { console.warn('realtime לא זמין:', e?.message); }
}
// מחכה ש-sb יהיה זמין
const _rtTry = setInterval(() => {
  if (window.sb) { clearInterval(_rtTry); startRealtime(); }
}, 300);
