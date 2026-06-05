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

// ─── נרמול עברי לפריטים כלליים (05) — זהה ל-norm_he ב-generic_match.py ───
// lowercase, הסרת ו/י, הסרת כל רווח. חייב להישאר מסונכרן עם צד ה-Python.
const _normGeneric = (s) => String(s || '').toLowerCase().replace(/[וי]/g, '').replace(/\s+/g, '');
const _COOLING_WORDS = ['קירור', 'קר', 'מקרר', 'קרה', 'קרר'];

// ─── זיהוי גודל אריזה לבירות מתוך שם המוצר ───
const detectPackSize = (name) => {
  const s = String(name || '');
  if (s.includes('ארגז'))    return { units: 24, label: 'ארגז' };
  if (s.includes('שישייה'))  return { units: 6,  label: 'שישייה' };
  if (s.includes('רביעייה')) return { units: 4,  label: 'רביעייה' };
  return { units: 1, label: 'בודד' };
};

// אתחול גלובלים ריקים — כדי שאף מסך לא יקרוס לפני שהנתונים נטענים
Object.assign(window, {
  BRANCHES: [
    { id: 'mikado', name: 'מיקדו', color: 'oklch(0.52 0.10 220)' },
    { id: 'kohav', name: 'כוכב הצפון', color: 'oklch(0.62 0.14 60)' },
  ],
  CATEGORIES: [{ id: 'all', label: 'הכל' }], SUPPLIERS: [], PRODUCTS: [],
  MONTHLY: [], DAILY_SAMPLE: {}, DAILY_BY_DATE: {}, DAILY_DETAILS: {},
  ORDERS: [], TRANSFERS: [], PROMOTIONS: [],
  ACTIVITY: [], INVENTORY_VALUE_BY_MONTH: [], INVENTORY_VALUE_TOTAL: { value: 0, mikado: 0, kohav: 0 },
  PAST_ORDERS: {}, LAST_RECEIVED: {},
  APPROVED_PRODUCTS: new Set(),
  PROMO_CATEGORIES: [], PROMO_BY_BARCODE: {},
  SETTINGS: { profitTarget: 25, defaultMin: 3, categoryMin: {}, showInclVat: true },
  FINANCE: { byMonth: {}, current: { totalExpense: 0, totalIncome: 0, grossProfit: 0, revenue: 0, netProfit: 0, netMargin: 0 } },
  EMPLOYEES: [], EMPLOYEE_HOURS: {}, GENERIC_PRODUCTS: [], EXTERNAL_CLIENTS: [],
  SUPPLIER_PURCHASES: { byMonth: {}, all: [] }, SUPPLIER_TERMS: [],
  BARCODE_ALIAS: {},
});

// Supabase PostgREST max_rows = 1000. טוענים בדפים עד שנגמר.
async function fetchAll(table, select = '*', opts = {}) {
  const sb = window.sb;
  const PAGE = 1000;
  let all = [], offset = 0;
  while (true) {
    let q = sb.from(table).select(select).range(offset, offset + PAGE - 1);
    if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? true });
    const { data, error } = await q;
    if (error) { console.warn(`fetchAll(${table}):`, error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;   // last page
    offset += PAGE;
  }
  return all;
}

async function loadAllData() {
  const sb = window.sb;
  const [products, monR, dayR, invRows, dealRows, transRows, ordRows, detR, appR, pcatR, ppromoR, setR, finR, empR, empHoursR, genR, extR, spR, supR] = await Promise.all([
    fetchAll('products'),
    sb.from('monthly_summary').select('*'),
    sb.from('daily_summary').select('*').order('summary_date', { ascending: false }),
    fetchAll('supplier_inventory'),
    fetchAll('import_deals'),
    fetchAll('transfers'),
    fetchAll('order_recommendations'),
    sb.from('daily_details').select('*').order('summary_date', { ascending: false }).limit(60),
    sb.from('product_approvals').select('barcode'),
    sb.from('promo_categories').select('*').order('price_total'),
    sb.from('product_promos').select('*'),
    sb.from('settings').select('key,value'),   // הגדרות גלובליות (יעד רווח, מינ׳ לפי קטגוריה) — graceful אם הטבלה חסרה
    sb.from('monthly_finance').select('*'),    // הוצאות + הכנסות חוץ-קופה — graceful אם הטבלה חסרה
    sb.from('employees').select('*').eq('is_active', true).order('name'),  // עובדים פעילים — graceful אם הטבלה חסרה
    sb.from('employee_hours').select('*'),     // שעות לפי חודש — graceful אם הטבלה חסרה
    sb.from('generic_products').select('*').eq('is_active', true),  // פריטים כלליים (05) — graceful אם הטבלה חסרה
    sb.from('external_clients').select('*').eq('is_active', true),   // לקוחות חיצוניים (וולט/תן ביס/פורטונה) — graceful אם הטבלה חסרה
    sb.from('supplier_purchases').select('*'),   // רכש לפי ספק×חודש (נכתב ע"י הצינור) — graceful אם הטבלה חסרה
    sb.from('suppliers').select('*'),            // תנאי תשלום לספקים (מנוהל-אפליקציה) — graceful אם הטבלה חסרה
  ]);

  // ─── אזהרה על טבלאות שנכשלו בטעינה (במקום silent || []) ───
  const _failedTables = [];
  [['monthly_summary', monR], ['daily_summary', dayR], ['daily_details', detR],
   ['product_approvals', appR], ['promo_categories', pcatR], ['product_promos', ppromoR],
   ['settings', setR], ['monthly_finance', finR], ['employees', empR], ['employee_hours', empHoursR],
  ].forEach(([name, res]) => {
    if (res && res.error) _failedTables.push(`${name}: ${res.error.message || res.error.code || 'unknown'}`);
  });
  if (_failedTables.length) {
    console.warn('[VinTrack] טבלאות שנכשלו בטעינה:', _failedTables);
    if (window.toast?.warn) window.toast.warn(`טעינה חלקית: ${_failedTables.length} טבלאות נכשלו (פתח קונסול)`, 5000);
  }
  // generic_products — טבלה אופציונלית/תוספתית: כשל (למשל טרם הורצה ה-SQL) נרשם לקונסול בלבד, ללא אזהרה מטרידה
  if (genR && genR.error) console.warn('[VinTrack] generic_products לא נטענה (אופציונלי):', genR.error.message || genR.error.code || 'unknown');
  if (extR && extR.error) console.warn('[VinTrack] external_clients לא נטענה (אופציונלי):', extR.error.message || extR.error.code || 'unknown');
  if (spR && spR.error) console.warn('[VinTrack] supplier_purchases לא נטענה (אופציונלי):', spR.error.message || spR.error.code || 'unknown');
  if (supR && supR.error) console.warn('[VinTrack] suppliers לא נטענה (אופציונלי):', supR.error.message || supR.error.code || 'unknown');

  // ─── מבצעי לקוחות (סוגי מבצעים + שיוך לכל מוצר) ───
  const PROMO_CATEGORIES = (pcatR.data || []).map((c) => {
    const u = n(c.units), pt = n(c.price_total), up = u > 0 ? pt / u : 0;
    return { id: c.id, name: c.name, units: u, price_total: pt,
             unit_price: up, unit_price_net: up / 1.18, active: c.active !== false };
  });
  const PROMO_BY_BARCODE = {};
  (ppromoR.data || []).forEach((r) => {
    const u = n(r.units), pt = n(r.price_total), up = u > 0 ? pt / u : 0;
    PROMO_BY_BARCODE[String(r.barcode)] = {
      id: r.promo_id, name: r.promo_name, units: u, price_total: pt,
      unit_price: up,            // מחיר ליחידה כולל מע"מ
      unit_price_net: up / 1.18, // נטו (להשוואה ל-effective_sell_price ולעלות)
    };
  });

  const BRANCHES = [
    { id: 'mikado', name: 'מיקדו', color: 'oklch(0.52 0.10 220)' },
    { id: 'kohav', name: 'כוכב הצפון', color: 'oklch(0.62 0.14 60)' },
  ];

  const PRODUCTS = products.map((p) => {
    const _cat = CATMAP[p.category] || 'other';
    const _pack = _cat === 'beer' ? detectPackSize(p.name) : { units: 1, label: '' };
    return {
      id: p.barcode || p.id,
      sku: p.barcode || '',
      name: p.name,
      cat: _cat,
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
        unify: p.parallel_unify_sales || false,
      } : null,
      extra: p.extra_barcodes || [],
      weekly: n(p.weekly_velocity),
      margin: n(p.profit_margin),
      is_promo: !!p.is_promo,
      min_stock: n(p.min_stock),
      effective_sell_price: p.effective_sell_price != null ? n(p.effective_sell_price) : null,
      promo: PROMO_BY_BARCODE[String(p.barcode)] || null,
      created_at: p.created_at || '',
      updated_at: p.updated_at || '',
      units_per_pack: _pack.units,
      pack_label: _pack.label,
    };
  });

  // ─── פריטים כלליים (ברקוד 05) — מרשם + סינתזה למוצרים ───
  // match_terms מנורמלים מראש כדי ש-window.matchGeneric יהיה זול. עלות מנוהלת מהאפליקציה.
  const GENERIC_PRODUCTS = (genR && genR.data ? genR.data : []).map((g) => {
    let terms = g.match_terms || [];
    if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = []; } }
    if (!Array.isArray(terms)) terms = [];
    const _normTerms = terms.map((t) => _normGeneric(t)).filter(Boolean);
    return {
      id: g.id, name: g.name, category: g.category || 'אחר',
      match_terms: terms, _normTerms,
      cost: n(g.cost), supplier: g.supplier || '',
      track_stock: !!g.track_stock,
      stock_mikado: n(g.stock_mikado), stock_kohav: n(g.stock_kohav),
      is_active: g.is_active !== false,
      weekly_qty: n(g.weekly_qty), month_qty: n(g.month_qty),
      month_revenue: n(g.month_revenue), month_profit: n(g.month_profit),
      updated_at: g.updated_at || '',
    };
  });

  // סינתזה לצורת-מוצר → מופיעים במלאי/מכירות באופן טבעי (sku ייחודי 'GEN-…', ללא נתיב כתיבה ל-products)
  GENERIC_PRODUCTS.forEach((g) => {
    const avgIncl = g.month_qty > 0 ? (g.month_revenue / g.month_qty) : 0;   // מחיר ממוצע כולל מע"מ
    const revExcl = g.month_revenue / 1.18;
    const margin = revExcl > 0 ? Math.round((g.month_profit / revExcl) * 100) : 0;
    PRODUCTS.push({
      id: 'GEN-' + g.id,
      sku: 'GEN-' + String(g.id).slice(0, 8),
      name: g.name,
      cat: 'generic',
      catLabel: g.category,
      supplier: g.supplier || 'פריט כללי',
      cost: g.cost,
      price: avgIncl,
      stock: { mikado: g.stock_mikado, kohav: g.stock_kohav },
      total: g.track_stock ? (g.stock_mikado + g.stock_kohav) : 0,
      parallel: null,
      extra: [],
      weekly: g.weekly_qty,
      margin,
      is_promo: false,
      min_stock: 0,
      effective_sell_price: null,
      promo: null,
      created_at: '',
      updated_at: g.updated_at,
      units_per_pack: 1,
      pack_label: '',
      isGeneric: true,
      genId: g.id,
      trackStock: !!g.track_stock,
      matchTerms: g.match_terms || [],
      monthRevenue: g.month_revenue,
      monthProfit: g.month_profit,
    });
  });

  // ─── לקוחות חיצוניים (וולט / תן ביס / פורטונה) — זיהוי לפי "לקוח_ספק", הפרדה מ-KPI ───
  // match_terms מנורמלים מראש ל-window.matchExternal. סטטיסטיקות נכתבות ע"י הצינור (PATCH).
  const EXTERNAL_CLIENTS = (extR && extR.data ? extR.data : []).map((c) => {
    let terms = c.match_terms || [];
    if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = []; } }
    if (!Array.isArray(terms)) terms = [];
    const _normTerms = terms.map((t) => _normGeneric(t)).filter(Boolean);
    return {
      id: c.id, name: c.name, match_terms: terms, _normTerms,
      kind: c.kind || 'delivery',
      commission_pct: n(c.commission_pct),
      pays_at_cost: !!c.pays_at_cost,
      open_account: !!c.open_account,
      payment_terms: c.payment_terms || '',
      is_active: c.is_active !== false,
      month_qty: n(c.month_qty), month_retail_incl: n(c.month_retail_incl),
      month_cost: n(c.month_cost), month_expected_net: n(c.month_expected_net),
      updated_at: c.updated_at || '',
    };
  });

  // ─── רכש וחבות לפי ספק (חודש×ספק) + תנאי תשלום ───
  // SUPPLIER_TERMS = [{name, payment_terms_days, match_terms, _normTerms, active, notes}] — מנוהל-אפליקציה.
  // match_terms מנורמלים מראש ל-window.matchSupplier (שמות בת.מ. רכש = שמות מלאים/וריאנטים → קנוני).
  // SUPPLIER_PURCHASES.byMonth[month] = [{supplier, amount_incl,...}] ממוין יורד; .all = הכל.
  const SUPPLIER_TERMS = ((supR && supR.data) || []).map((s) => {
    let terms = s.match_terms || [];
    if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = []; } }
    if (!Array.isArray(terms)) terms = [];
    const _normTerms = terms.map((t) => _normGeneric(t)).filter(Boolean);
    return {
      name: s.name, payment_terms_days: n(s.payment_terms_days) || 30,
      match_terms: terms, _normTerms,
      active: s.active !== false, notes: s.notes || '',
    };
  });
  const SUPPLIER_PURCHASES = { byMonth: {}, all: [] };
  ((spR && spR.data) || []).forEach((r) => {
    if (!r.month || !r.supplier) return;
    const rec = {
      month: r.month, month_label: r.month_label || mlabel(r.month), supplier: r.supplier,
      amount_incl: n(r.amount_incl), amount_excl: n(r.amount_excl), units: n(r.units),
      incl_mikado: n(r.incl_mikado), incl_kochav: n(r.incl_kochav),
      doc_count: n(r.doc_count), is_current: !!r.is_current,
    };
    SUPPLIER_PURCHASES.all.push(rec);
    (SUPPLIER_PURCHASES.byMonth[rec.month] = SUPPLIER_PURCHASES.byMonth[rec.month] || []).push(rec);
  });
  Object.keys(SUPPLIER_PURCHASES.byMonth).forEach((m) => {
    SUPPLIER_PURCHASES.byMonth[m].sort((a, b) => b.amount_incl - a.amount_incl);
  });

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
      month: r.month, m: mlabel(r.month), total: n(r.revenue_total), mikado: n(r.revenue_mikado), kohav: n(r.revenue_kochav),
      profit: n(r.profit_est), margin: n(r.margin_pct), days: n(r.days_active),
      purchases: n(r.purchases),
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

  // שווי מלאי לפי ספק/חודש (+ פיצול סניפים לחודש האחרון — לפס ה-KPI העליון)
  const invMap = {};
  const invBranch = {};   // month -> {value, mikado, kohav}
  (invRows || []).forEach((r) => {
    if (!invMap[r.month]) invMap[r.month] = { m: mlabel(r.month), values: {} };
    invMap[r.month].values[r.supplier] = n(r.value);
    if (!invBranch[r.month]) invBranch[r.month] = { value: 0, mikado: 0, kohav: 0 };
    invBranch[r.month].value += n(r.value);
    invBranch[r.month].mikado += n(r.value_mikado);
    invBranch[r.month].kohav += n(r.value_kochav);
  });
  const _invMonths = Object.keys(invMap).sort();
  const INVENTORY_VALUE_BY_MONTH = _invMonths.map((k) => invMap[k]);
  const _lastInvMonth = _invMonths[_invMonths.length - 1];
  const INVENTORY_VALUE_TOTAL = _lastInvMonth ? invBranch[_lastInvMonth] : { value: 0, mikado: 0, kohav: 0 };

  // מבצעים
  const PROMOTIONS = (dealRows || []).map((d) => ({
    id: d.id, supplier: d.supplier || '', title: d.title || d.product_name || '', ends: d.valid_until || '',
    items: 0, barcode: d.barcode || '',
    deal_cost: d.deal_cost || 0, regular_cost: d.regular_cost || 0, sell_price: d.sell_price || 0,
    discount: (d.regular_cost && d.deal_cost) ? Math.round((1 - d.deal_cost / d.regular_cost) * 100) : 0,
    notes: d.notes || '', is_active: d.is_active !== false,
  }));

  // העברות
  const stMap = { 'ממתין': 'pending', 'בוצע': 'completed', 'בוטל': 'cancelled' };
  const TRANSFERS = (transRows || []).map((t, i) => ({
    id: 'T-' + (i + 1), from: t.from_branch === 'מיקדו' ? 'mikado' : 'kohav',
    to: t.to_branch === 'מיקדו' ? 'mikado' : 'kohav', items: 1, units: n(t.quantity),
    status: stMap[t.status] || 'pending', tone: t.status === 'בוצע' ? 'ok' : 'warn',
    date: '', user: '', name: t.product_name,
  }));

  // הזמנות (קיבוץ המלצות לפי ספק)
  const ordBySup = {};
  (ordRows || []).forEach((o) => { (ordBySup[o.supplier] = ordBySup[o.supplier] || []).push(o); });
  const ORDERS = Object.keys(ordBySup).map((sup, i) => ({
    id: '#' + (5100 + i), supplier: sup, branch: 'both', date: '', eta: '',
    items: ordBySup[sup].length, sum: 0, status: 'pending', tone: 'warn',
  }));

  // פרטי יום מורחבים (מובילים, 05, הנחות, חריגות, חדשים) — לטאב Daily
  const DAILY_DETAILS = {};
  (detR.data || []).forEach((r) => {
    if (!r.summary_date) return;
    const _jp = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || []); } catch { return []; } };
    DAILY_DETAILS[r.summary_date] = {
      top_sellers: _jp(r.top_sellers),
      generic_05: _jp(r.generic_05),
      club_discounts: _jp(r.club_discounts),
      price_anomalies: _jp(r.price_anomalies),
      new_products: _jp(r.new_products),
      promo_stats: typeof r.promo_stats === 'string' ? JSON.parse(r.promo_stats || '{}') : (r.promo_stats || {}),
      incoming_purchases: _jp(r.incoming_purchases),
      incoming_transfers: _jp(r.incoming_transfers),
      cashier_stats: _jp(r.cashier_stats),
      returns: _jp(r.returns),
      returns_count: n(r.returns_count),
      returns_net_total: n(r.returns_net_total),
      total_revenue: n(r.total_revenue),
      receipts: n(r.receipts),
      avg_basket: n(r.avg_basket),
      purchase_count: n(r.purchase_count),
      transfer_count: n(r.transfer_count),
      external_clients: _jp(r.external_clients),
    };
  });

  // אישורי מוצרים — Set של ברקודים שאושרו (טבלה נפרדת, לא מושפעת מ-DELETE+INSERT)
  const APPROVED_PRODUCTS = new Set((appR.data || []).map(r => r.barcode));

  // ─── הגדרות גלובליות (settings: key→value jsonb) ───
  // נטען מ-Supabase; אם הטבלה חסרה (setR.error) — fallback ל-localStorage כדי שהמכשיר הראשי עדיין יעבוד.
  const SETTINGS = { profitTarget: 25, defaultMin: 3, categoryMin: {}, showInclVat: true };
  const setRows = (setR && setR.data) ? setR.data : [];
  if (setRows.length) {
    setRows.forEach((r) => {
      if (r.key === 'profit_target') SETTINGS.profitTarget = n(r.value) || 25;
      else if (r.key === 'default_min') SETTINGS.defaultMin = n(r.value) || 3;
      else if (r.key === 'show_incl_vat') SETTINGS.showInclVat = (r.value === true || r.value === 'true' || r.value === 1);
      else if (r.key === 'category_min') {
        let v = r.value;
        try { if (typeof v === 'string') v = JSON.parse(v); } catch { v = {}; }
        if (v && typeof v === 'object') SETTINGS.categoryMin = v;
      }
    });
  } else {
    try {
      const ls = JSON.parse(localStorage.getItem('vintrack_settings') || '{}');
      if (ls.profitTarget) SETTINGS.profitTarget = n(ls.profitTarget) || 25;
      if (ls.defaultMin) SETTINGS.defaultMin = n(ls.defaultMin) || 3;
      if (ls.categoryMin && typeof ls.categoryMin === 'object') SETTINGS.categoryMin = ls.categoryMin;
      if (typeof ls.showInclVat === 'boolean') SETTINGS.showInclVat = ls.showInclVat;
    } catch { /* noop */ }
  }

  // ─── עובדים + שעות (employees + employee_hours) ───
  const EMPLOYEES = (empR && empR.data) ? empR.data : [];
  const EMPLOYEE_HOURS = {};
  ((empHoursR && empHoursR.data) || []).forEach((h) => {
    EMPLOYEE_HOURS[`${h.employee_id}__${h.month}`] = h;
  });

  // ─── הוצאות + הכנסות חוץ-קופה לפי חודש (monthly_finance) — לחישוב רווח נטו ───
  // נטען מ-Supabase; אם הטבלה חסרה/ריקה — fallback ל-localStorage (מכשיר ראשי לפני SQL).
  const FIN_EXP = ['salaries', 'rent', 'electricity', 'water', 'arnona', 'management', 'other_expense'];
  const FIN_INC = ['wolt', 'tenbis', 'external_sales'];
  const mkFin = (row) => {
    const o = { month: row.month || '', notes: row.notes || '' };
    FIN_EXP.concat(FIN_INC).forEach((f) => { o[f] = n(row[f]); });
    o.totalExpense = FIN_EXP.reduce((a, f) => a + o[f], 0);
    o.totalIncome = FIN_INC.reduce((a, f) => a + o[f], 0);
    return o;
  };
  const FINANCE = { byMonth: {}, current: null };
  let finRows = (finR && finR.data) ? finR.data : [];
  if (!finRows.length) {
    try {
      const ls = JSON.parse(localStorage.getItem('vintrack_finance') || '{}');
      finRows = Object.keys(ls).map((m) => ({ month: m, ...ls[m] }));
    } catch { /* noop */ }
  }
  finRows.forEach((r) => { if (r.month) FINANCE.byMonth[r.month] = mkFin(r); });
  FINANCE.current = FINANCE.byMonth[curMonth] || mkFin({ month: curMonth });
  // צירוף רווח גולמי + הכנסות חוץ-קופה − הוצאות = רווח נטו (לחודש הנוכחי)
  // רכש חודשי: monthly_summary.purchases (מקובץ ההיסטוריה); אם חסר (חודשים אחרונים שעדיין
  // לא נכנסו לקובץ) → fallback לסכום supplier_purchases (נבנה מהדוחות היומיים). amount_excl = ללא מע״מ.
  const _purchFor = (m) => {
    if (!m) return 0;
    if (m.purchases) return m.purchases;
    const sp = SUPPLIER_PURCHASES.byMonth[m.month] || [];
    return sp.reduce((a, r) => a + (r.amount_excl || 0), 0);
  };
  const _curM = MONTHLY.find((x) => x.current) || null;
  FINANCE.current.grossProfit = _curM ? _curM.profit : 0;
  FINANCE.current.revenue = _curM ? _curM.total : 0;
  FINANCE.current.purchases = _purchFor(_curM);
  function _recalcPL(fin) {
    fin.netProfit = fin.grossProfit + fin.totalIncome - fin.totalExpense;
    fin.netMargin = fin.revenue > 0 ? (fin.netProfit / fin.revenue) * 100 : 0;
    fin.plProfit = fin.revenue + fin.totalIncome - fin.purchases - fin.totalExpense;
    fin.plMargin = fin.revenue > 0 ? (fin.plProfit / fin.revenue) * 100 : 0;
  }
  _recalcPL(FINANCE.current);
  // P&L לכל חודש ב-byMonth
  MONTHLY.forEach(function(m) {
    const fm = FINANCE.byMonth[m.month];
    const purch = _purchFor(m);
    const inc = fm ? fm.totalIncome : 0;
    const exp = fm ? fm.totalExpense : 0;
    m.plProfit = m.total + inc - purch - exp;
    m.purchases = purch;
  });

  // ─── אם יש שעות עובדים לחודש הנוכחי — דרוס את salaries בעלות מעסיק האמיתית ───
  if (EMPLOYEES.length && Object.keys(EMPLOYEE_HOURS).length) {
    // חישוב מקומי כדי שלא נסמוך על window.totalPayrollForMonth שעדיין לא מוגדר
    let _payTotal = 0, _payGross = 0, _payWith = 0;
    EMPLOYEES.forEach((emp) => {
      const h = EMPLOYEE_HOURS[`${emp.id}__${curMonth}`];
      if (!h) return;
      const reg = n(h.regular_hours), e125 = n(h.extra_hours_125), e150 = n(h.extra_hours_150);
      if (reg + e125 + e150 === 0) return;
      _payWith++;
      const r = n(emp.hourly_rate);
      const gross = reg * r + e125 * r * 1.25 + e150 * r * 1.5;
      const pension   = gross * n(emp.pension_pct) / 100;
      const severance = gross * n(emp.severance_pct) / 100;
      const fund      = emp.include_fund ? gross * n(emp.fund_pct) / 100 : 0;
      // ביטוח לאומי מעסיק (מדורג)
      let bituach = 0;
      const LO = 7522, HI = 46620;
      if (gross <= LO) bituach = gross * 0.0355;
      else if (gross <= HI) bituach = LO * 0.0355 + (gross - LO) * 0.076;
      else bituach = LO * 0.0355 + (HI - LO) * 0.076;
      _payGross += gross;
      _payTotal += gross + pension + severance + fund + bituach;
    });
    if (_payWith > 0) {
      FINANCE.current.salaries_calculated = Math.round(_payTotal);
      FINANCE.current.salaries_gross = Math.round(_payGross);
      FINANCE.current.payroll_employees = _payWith;
      // החלף את הסכום הידני בעלות מעסיק המחושבת
      FINANCE.current.totalExpense = FINANCE.current.totalExpense - FINANCE.current.salaries + _payTotal;
      _recalcPL(FINANCE.current);
    }
  }

  // ─── מיזוג ייבוא מקביל: ברקודים מאוחדים מסוכמים תחת המוצר הראשי ───
  const _barcodeAlias = {};
  const _byBarcode = {};
  PRODUCTS.forEach((p) => { _byBarcode[p.sku] = p; });
  PRODUCTS.forEach((p) => {
    if (p.parallel && p.parallel.sku && p.parallel.unify) {
      const parSku = p.parallel.sku;
      _barcodeAlias[parSku] = p.sku;
      const parProd = _byBarcode[parSku];
      if (parProd) {
        p.weekly = (p.weekly || 0) + (parProd.weekly || 0);
        p.total = p.total + parProd.total;
        p.stock.mikado += parProd.stock.mikado;
        p.stock.kohav  += parProd.stock.kohav;
      }
    }
  });
  const _aliasSet = new Set(Object.keys(_barcodeAlias));
  const PRODUCTS_FINAL = PRODUCTS.filter((p) => !_aliasSet.has(p.sku));

  // גיל-נתונים אמיתי: מתי הצינור דחף לאחרונה (max products.updated_at).
  // זה ה-heartbeat של הסנכרון — שונה מ-LAST_REFRESH (מתי האפליקציה משכה).
  let _lastSync = 0;
  for (const p of PRODUCTS_FINAL) {
    if (p.updated_at) { const t = Date.parse(p.updated_at); if (t > _lastSync) _lastSync = t; }
  }

  Object.assign(window, {
    BRANCHES, CATEGORIES, SUPPLIERS, PRODUCTS: PRODUCTS_FINAL, MONTHLY, DAILY_SAMPLE, DAILY_BY_DATE,
    ORDERS, TRANSFERS, PROMOTIONS, ACTIVITY: [], INVENTORY_VALUE_BY_MONTH, INVENTORY_VALUE_TOTAL,
    DAILY_DETAILS, APPROVED_PRODUCTS,
    PROMO_CATEGORIES, PROMO_BY_BARCODE, SETTINGS, FINANCE,
    EMPLOYEES, EMPLOYEE_HOURS, GENERIC_PRODUCTS, EXTERNAL_CLIENTS,
    SUPPLIER_PURCHASES, SUPPLIER_TERMS,
    BARCODE_ALIAS: _barcodeAlias,
    PAST_ORDERS: {}, LAST_RECEIVED: {},
    LAST_REFRESH: Date.now(),
    LAST_DATA_SYNC: _lastSync || null,
  });
}

window.loadAllData = loadAllData;

// ─── חישובי שכר — ביטוח לאומי מעסיק לפי מדרגות 2026 ───
// מדרגות: 3.55% עד ₪7,522 · 7.60% מ-₪7,522 עד ₪46,620 (תקרה לחודש)
window.calcBituachLeumi = function (gross) {
  const LO = 7522, HI = 46620;
  if (gross <= 0) return 0;
  if (gross <= LO) return gross * 0.0355;
  if (gross <= HI) return LO * 0.0355 + (gross - LO) * 0.076;
  return LO * 0.0355 + (HI - LO) * 0.076;
};

// חישוב שכר מלא לעובד יחיד — ברוטו + הפרשות מעסיק
window.calcPayroll = function (emp, hours) {
  const r = Number(emp.hourly_rate) || 0;
  const reg  = Number(hours.regular_hours)    || 0;
  const e125 = Number(hours.extra_hours_125)  || 0;
  const e150 = Number(hours.extra_hours_150)  || 0;
  const gross = reg * r + e125 * r * 1.25 + e150 * r * 1.5;
  const pension   = gross * (Number(emp.pension_pct)   || 0) / 100;
  const severance = gross * (Number(emp.severance_pct) || 0) / 100;
  const fund      = emp.include_fund ? gross * (Number(emp.fund_pct) || 0) / 100 : 0;
  const bituach   = window.calcBituachLeumi(gross);
  const additions = pension + severance + fund + bituach;
  return { gross, pension, severance, fund, bituach, additions, total: gross + additions };
};

// סיכום שכר לכל החודש (לחישוב KPI/דשבורד)
window.totalPayrollForMonth = function (month) {
  let gross = 0, total = 0, withHours = 0;
  const emps = window.EMPLOYEES || [];
  const hrs = window.EMPLOYEE_HOURS || {};
  emps.forEach((emp) => {
    const h = hrs[`${emp.id}__${month}`];
    if (!h) return;
    const reg = Number(h.regular_hours) || 0;
    const e125 = Number(h.extra_hours_125) || 0;
    const e150 = Number(h.extra_hours_150) || 0;
    if (reg + e125 + e150 === 0) return;
    withHours++;
    const p = window.calcPayroll(emp, h);
    gross += p.gross;
    total += p.total;
  });
  return { gross: Math.round(gross), total: Math.round(total), count: emps.length, withHours };
};

// ─── עזרי תצוגת מע"מ — תלוי בהגדרה SETTINGS.showInclVat (ברירת מחדל: כולל, כמו בקופה) ───
// ערכי מחזור מאוחסנים ב-Supabase ללא מע"מ. הכפלה ב-vatMult() נותנת את התצוגה הראשית.
window.vatOn       = () => (window.SETTINGS?.showInclVat !== false);  // true = מציגים כולל מע"מ
window.vatMult     = () => (window.vatOn() ? 1.18 : 1);              // מכפיל לערך הראשי
window.vatMultOpp  = () => (window.vatOn() ? 1 : 1.18);             // מכפיל לשורה המשנית (הפוך)
window.vatLabel    = () => (window.vatOn() ? 'כולל מע״מ' : 'ללא מע״מ');
window.vatLabelOpp = () => (window.vatOn() ? 'ללא מע״מ' : 'כולל מע״מ');

// ─── התאמת פריט כללי (05) לפי שם — זהה ל-match_generic ב-generic_match.py ───
// מחזיר את רשומת ה-GENERIC_PRODUCTS עם ה-term הארוך ביותר שהוא substring בשם המנורמל,
// או null. מילות קירור → תמיד null (נשמרות 100% רווח).
window.matchGeneric = function (name) {
  const reg = window.GENERIC_PRODUCTS || [];
  if (!reg.length || !name) return null;
  const words = String(name).split(/[\s,\-]+/);
  if (words.some((w) => _COOLING_WORDS.includes(w))) return null;
  const nn = _normGeneric(name);
  if (!nn) return null;
  let best = null, bestLen = 0;
  for (const g of reg) {
    for (const nt of (g._normTerms || [])) {
      if (nt && nn.includes(nt) && nt.length > bestLen) { best = g; bestLen = nt.length; }
    }
  }
  return best;
};

// ─── התאמת לקוח חיצוני לפי שם (חייב להישאר מסונכרן עם external_match.match_external ב-Python) ───
// אין מושג "קירור" כאן — מתאים על שם הלקוח/ספק, ה-term הארוך ביותר שהוא substring מנצח.
window.matchExternal = function (customer) {
  const reg = window.EXTERNAL_CLIENTS || [];
  if (!reg.length || !customer) return null;
  const nn = _normGeneric(customer);
  if (!nn) return null;
  let best = null, bestLen = 0;
  for (const c of reg) {
    for (const nt of (c._normTerms || [])) {
      if (nt && nn.includes(nt) && nt.length > bestLen) { best = c; bestLen = nt.length; }
    }
  }
  return best;
};

// ─── התאמת ספק לפי שם (שמות בת.מ. רכש = שמות מלאים/וריאנטים) → רשומה קנונית ───
// ה-term הארוך ביותר שהוא substring מנצח. מאחד וריאנטים (גרש/גרשיים, בעמ/בע"מ) לספק אחד.
window.matchSupplier = function (name) {
  const reg = window.SUPPLIER_TERMS || [];
  if (!reg.length || !name) return null;
  const nn = _normGeneric(name);
  if (!nn) return null;
  let best = null, bestLen = 0;
  for (const s of reg) {
    for (const nt of (s._normTerms || [])) {
      if (nt && nn.includes(nt) && nt.length > bestLen) { best = s; bestLen = nt.length; }
    }
  }
  return best;
};

// ─── רענון אוטומטי: בכל חזרה לטאב + ברקע כל 90 שניות + Supabase realtime ───
// כל אלה מעדכנים את window.PRODUCTS/MONTHLY/DAILY וכו'. הקומפוננטות
// משתמשות בהם דרך גישה ישירה ל-window, אבל כדי לרענן UI גם בלי re-render
// טבעי — אנחנו מפעילים אירוע 'vintrack:data-updated' שקומפוננטות יכולות להאזין.
let _refreshing = false;
async function refreshData(reason = 'manual') {
  if (_refreshing) return;
  _refreshing = true;
  window.dispatchEvent(new CustomEvent('vintrack:refresh-start', { detail: { reason, at: Date.now() } }));
  // Timeout — אם loadAllData נתקע (realtime מקולקל וכו') — לעבור הלאה אחרי 15 שניות
  const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 15s')), 15000));
  try {
    await Promise.race([loadAllData(), timeoutPromise]);
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

// ─── requestFreshSync — מבקש מהמחשב להוריד דוח טרי מ-CashOnTab ───
// כותב שורה ל-sync_requests; sync_worker.py על המחשב יתפוס תוך 5-10 שניות,
// יריץ את המחזור (~30-60 שניות), ויעדכן processed_at. ה-realtime listener
// למטה יזהה את העדכון ויקרא ל-refreshData('post-sync') אוטומטית.
let _lastRequestAt = 0;
async function requestFreshSync(reason = 'manual') {
  // Throttle: לא יותר מבקשה אחת כל 30 שניות
  if (Date.now() - _lastRequestAt < 30000) {
    console.log('[VinTrack] בקשה נדחתה (throttle 30s)');
    if (window.toast) window.toast.info('המתנה ~30 שניות בין בקשות');
    return false;
  }
  if (!window.sb) return false;
  _lastRequestAt = Date.now();
  try {
    // משתמשים בטבלת additional_income הקיימת כתור-בקשות (חוסך SQL DDL)
    // month='__SYNC_REQUEST__' = signal. amount = timestamp ms. ה-worker מוחק אחרי שטיפל.
    const { error } = await window.sb.from('additional_income').insert({
      month: '__SYNC_REQUEST__',
      description: reason.slice(0, 100),
      amount: Date.now(),
      has_invoice: false,
    });
    if (error) {
      console.warn('[VinTrack] requestFreshSync נכשל:', error.message);
      // נסיון רענון רגיל (בלי הורדה) כ-fallback
      refreshData('fallback-' + reason);
      return false;
    }
    console.log('[VinTrack] בקשת הורדה נשלחה:', reason);
    if (window.toast) window.toast.info('מוריד דוח טרי מ-CashOnTab… (30-60 שניות)', 5000);
    return true;
  } catch (e) {
    console.warn('[VinTrack] requestFreshSync exception:', e?.message);
    refreshData('fallback-' + reason);
    return false;
  }
}
window.requestFreshSync = requestFreshSync;

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
// ⚠ throttle: לא יותר מrefresh אחד כל 8 שניות, גם אם 1,000 שינויים נכנסים בבת אחת
let _rtLastRefresh = 0;
let _rtDebounce = null;
function realtimeRefresh(table) {
  const since = Date.now() - _rtLastRefresh;
  if (since < 8000) {
    // יותר מדי events בבת אחת — דחה ל-8 שניות, אבל רק פעם אחת
    if (_rtDebounce) return;
    _rtDebounce = setTimeout(() => {
      _rtDebounce = null;
      _rtLastRefresh = Date.now();
      refreshData('realtime:throttled');
    }, 8000 - since);
    return;
  }
  _rtLastRefresh = Date.now();
  refreshData('realtime:' + table);
}

let _rtRetryTimer = null;
function startRealtime() {
  try {
    if (!window.sb) return;
    // ניקוי ערוץ קודם אם קיים — מונע דליפת ערוצים בריצות חוזרות
    if (window._vtChannel) {
      try { window._vtChannel.unsubscribe(); } catch (_) {}
      window._vtChannel = null;
    }
    if (_rtRetryTimer) { clearTimeout(_rtRetryTimer); _rtRetryTimer = null; }

    const tables = ['products', 'daily_summary', 'daily_details', 'monthly_summary',
                    'supplier_inventory', 'order_recommendations', 'transfers', 'import_deals'];
    const ch = window.sb.channel('vintrack-live');
    tables.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t },
                                () => realtimeRefresh(t)));
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'additional_income' }, (payload) => {
      const row = payload?.old;
      if (row?.month === '__SYNC_REQUEST__') {
        console.log('[VinTrack] sync done by worker — refreshing');
        if (window.toast) window.toast.success('✓ דוח טרי הורד — מתעדכן…');
        setTimeout(() => refreshData('post-worker'), 1500);
      }
    });
    ch.subscribe((status) => {
      console.log('[VinTrack] realtime status:', status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // רק timer אחד פעיל בכל זמן — לא יוצרים מקבילים
        if (_rtRetryTimer) return;
        _rtRetryTimer = setTimeout(() => { _rtRetryTimer = null; startRealtime(); }, 5000);
      }
    });
    window._vtChannel = ch;
  } catch (e) { console.warn('realtime לא זמין:', e?.message); }
}
// מחכה ש-sb יהיה זמין
const _rtTry = setInterval(() => {
  if (window.sb) { clearInterval(_rtTry); startRealtime(); }
}, 300);
