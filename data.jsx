// === Mock data: wine store with 2 branches ===

const BRANCHES = [
  { id: 'mikado', name: 'מיקדו', color: 'oklch(0.52 0.10 220)' },
  { id: 'kohav',  name: 'כוכב הצפון', color: 'oklch(0.62 0.14 60)' },
];

const CATEGORIES = [
  { id: 'all', label: 'הכל' },
  { id: 'red',     label: 'יין אדום' },
  { id: 'white',   label: 'יין לבן' },
  { id: 'rose',    label: 'רוזה' },
  { id: 'sparkle', label: 'מבעבע' },
  { id: 'vodka',   label: 'וודקה' },
  { id: 'whisky',  label: 'וויסקי' },
  { id: 'arak',    label: 'ערק' },
  { id: 'gin',     label: 'ג׳ין' },
  { id: 'liqueur', label: 'ליקרים' },
];

const SUPPLIERS = [
  { id: 'esprit',   name: 'אספיריט יבוא',   lead: '24 שעות', items: 142 },
  { id: 'hakerem',  name: 'הכרם',           lead: '48 שעות', items: 88 },
  { id: 'aviv',     name: 'אביב הפצה',      lead: '24 שעות', items: 116 },
  { id: 'gold',     name: 'גולד יינות',     lead: '3-5 ימים', items: 64 },
  { id: 'tiroshlu', name: 'תירוש לוקסמבורג', lead: '5 ימים',  items: 38 },
  { id: 'wine_plus', name: 'וויין פלוס',    lead: '24 שעות', items: 92 },
];

// Helper to make a product
const mk = (id, sku, name, cat, supplier, cost, price, mikado, kohav, parallel = null) => ({
  id, sku, name, cat, supplier,
  cost, price,
  stock: { mikado, kohav },
  total: mikado + kohav,
  parallel, // { sku, supplier, cost, stock: { mikado, kohav } } | null
  updated: 'לפני 4 שעות',
});

const PRODUCTS = [
  mk('w001', '7290000111101', 'יקב רקנאטי קברנה סוביניון 2021',  'red', 'esprit',  68, 129.90, 8,  5),
  mk('w002', '7290000111102', 'יקב גליל עליון יראון 2020',        'red', 'aviv',    92, 169.90, 4,  2),
  mk('w003', '7290000111103', 'יקב טפרברג ספיישל רזרב מרלו 2022', 'red', 'hakerem', 52, 89.90,  12, 7),
  mk('w004', '7290000111104', 'דלתון קנען אדום 2021',             'red', 'gold',    44, 79.90,  18, 11),
  mk('w005', '7290000111105', 'יקב ירדן שרדונה 2022',             'white','esprit', 58, 109.90, 6,  3),
  mk('w006', '7290000111106', 'יקב כרמל סוביניון בלאן 2023',      'white','aviv',   38, 69.90,  22, 14),
  mk('w007', '7290000111107', 'יקב גוש עציון לבן 2023',           'white','hakerem',42, 79.90,  9,  4),
  mk('w008', '7290000111108', 'מואט שאנדון אימפריאל ברוט',        'sparkle','tiroshlu', 145, 269.00, 3, 2),
  mk('w009', '7290000111109', 'פרוסקו ויניברטה DOC',              'sparkle','wine_plus', 48, 89.90, 8, 6),
  mk('w010', '7312040017072', 'אבסולוט וודקה 1L',                 'vodka', 'esprit', 45, 89.90,  5, 3,
    { sku: '7312040551027', supplier: 'hakerem', cost: 42, stock: { mikado: 2, kohav: 0 } }),
  mk('w011', '5010103915809', 'גריי גוז וודקה 700ml',             'vodka', 'wine_plus', 98, 189.00, 4, 2),
  mk('w012', '5000281020556', 'ג׳וני ווקר בלאק לייבל 700ml',      'whisky','esprit',  118, 219.00, 6, 4,
    { sku: '5000281041568', supplier: 'aviv', cost: 112, stock: { mikado: 3, kohav: 2 } }),
  mk('w013', '5000267023625', 'גלנפיידיך 12 שנים 700ml',          'whisky','tiroshlu', 158, 289.00, 2, 1),
  mk('w014', '5010103902748', 'גלנליווט פאונדרס רזרב',            'whisky','gold',    142, 259.00, 0, 1),
  mk('w015', '7290000111115', 'ערק אלעריזה ענבים 700ml',          'arak',  'hakerem',  32, 64.90,  14, 9),
  mk('w016', '7290000111116', 'ערק הזית 1L',                       'arak',  'aviv',    28, 54.90,  11, 6),
  mk('w017', '5010677714006', 'הנדריקס ג׳ין 700ml',                'gin',   'esprit', 122, 229.00, 5, 3),
  mk('w018', '5010103915304', 'בומביי ספייר 750ml',                'gin',   'wine_plus', 88, 169.00, 7, 4),
  mk('w019', '7290000111119', 'יקב ביתן רוזה 2023',                'rose',  'gold',    36, 64.90,  10, 8),
  mk('w020', '7290000111120', 'יקב יתיר רוזה 2023',                'rose',  'hakerem', 48, 89.90,  4, 2),
  mk('w021', '7290000111121', 'בייליס אוריג׳ינל אייריש',          'liqueur','esprit', 58, 99.90,  9, 6,
    { sku: '5011013100569', supplier: 'wine_plus', cost: 54, stock: { mikado: 4, kohav: 1 } }),
  mk('w022', '7290000111122', 'אמרטו דיסרונו 700ml',              'liqueur','aviv',   72, 139.00, 3, 2),
  mk('w023', '7290000111123', 'יקב טוליפ סיריה 2020',             'red',   'esprit', 88, 159.00, -2, 1),
  mk('w024', '7290000111124', 'יקב בנימינה רזרב קברנה 2021',     'red',   'aviv',   62, 119.00, 0, 0),
  mk('w025', '7290000111125', 'יקב טפרברג קברנה מבית 2022',       'red',   'hakerem',32, 59.90,  -5, 3),
];

// Monthly summary: Nov 2025 → May 2026 (current)
const MONTHLY = [
  { m: 'נוב 2025', total: 392400, mikado: 215820, kohav: 176580, profit: 96780, margin: 24.7, days: 30, extra: 4200 },
  { m: 'דצמ 2025', total: 478900, mikado: 268180, kohav: 210720, profit: 124514, margin: 26.0, days: 31, extra: 8400 },
  { m: 'ינו 2026', total: 412300, mikado: 232940, kohav: 179360, profit: 99352, margin: 24.1, days: 31, extra: 5600 },
  { m: 'פבר 2026', total: 388700, mikado: 218680, kohav: 170020, profit: 95231, margin: 24.5, days: 28, extra: 3200 },
  { m: 'מרץ 2026', total: 441800, mikado: 252270, kohav: 189530, profit: 113984, margin: 25.8, days: 31, extra: 4800 },
  { m: 'אפר 2026', total: 419600, mikado: 238170, kohav: 181430, profit: 105318, margin: 25.1, days: 30, extra: 6100 },
  { m: 'מאי 2026', total: 421850, mikado: 246780, kohav: 175070, profit: 109901, margin: 26.1, days: 23, extra: 7200, current: true },
];

// Daily sales lines (for daily summary)
const DAILY_SAMPLE = {
  date: '23/05/2026',
  total: 18420.50,
  mikado: 11280.00,
  kohav: 7140.50,
  profit: 4865.20,
  margin: 26.4,
  lines: [
    { time: '09:14', branch: 'mikado', sku: 'w006', name: 'יקב כרמל סוביניון בלאן 2023', qty: 2, sum: 139.80, profit: 36.40 },
    { time: '09:42', branch: 'kohav',  sku: 'w012', name: 'ג׳וני ווקר בלאק לייבל 700ml', qty: 1, sum: 219.00, profit: 75.00 },
    { time: '10:18', branch: 'mikado', sku: 'w001', name: 'יקב רקנאטי קברנה סוביניון 2021', qty: 3, sum: 389.70, profit: 110.10 },
    { time: '10:55', branch: 'mikado', sku: 'w010', name: 'אבסולוט וודקה 1L', qty: 2, sum: 179.80, profit: 53.40 },
    { time: '11:30', branch: 'kohav',  sku: 'w015', name: 'ערק אלעריזה ענבים 700ml', qty: 4, sum: 259.60, profit: 91.60 },
    { time: '12:08', branch: 'kohav',  sku: 'w021', name: 'בייליס אוריג׳ינל אייריש', qty: 1, sum: 99.90, profit: 27.40 },
    { time: '13:22', branch: 'mikado', sku: 'w008', name: 'מואט שאנדון אימפריאל ברוט', qty: 1, sum: 269.00, profit: 84.00 },
    { time: '14:40', branch: 'mikado', sku: 'w005', name: 'יקב ירדן שרדונה 2022', qty: 2, sum: 219.80, profit: 78.40 },
    { time: '15:15', branch: 'kohav',  sku: 'w017', name: 'הנדריקס ג׳ין 700ml', qty: 1, sum: 229.00, profit: 79.40 },
    { time: '16:02', branch: 'mikado', sku: 'w003', name: 'יקב טפרברג ספיישל רזרב מרלו 2022', qty: 5, sum: 449.50, profit: 168.50 },
  ],
};

// Open orders to suppliers
const ORDERS = [
  { id: '#5102', supplier: 'esprit',  branch: 'mikado', date: '21/05', eta: '25/05', items: 12, sum: 4820, status: 'sent',     tone: 'ok' },
  { id: '#5103', supplier: 'aviv',    branch: 'both',   date: '22/05', eta: '23/05', items: 8,  sum: 2980, status: 'pending',  tone: 'warn' },
  { id: '#5104', supplier: 'hakerem', branch: 'kohav',  date: '22/05', eta: '24/05', items: 14, sum: 5340, status: 'prep',     tone: 'accent' },
  { id: '#5105', supplier: 'gold',    branch: 'mikado', date: '23/05', eta: '28/05', items: 6,  sum: 1870, status: 'sent',     tone: 'ok' },
  { id: '#5098', supplier: 'tiroshlu', branch: 'mikado', date: '18/05', eta: '22/05', items: 4, sum: 1290, status: 'late',     tone: 'danger' },
  { id: '#5106', supplier: 'wine_plus', branch: 'both', date: '23/05', eta: '24/05', items: 11, sum: 3450, status: 'pending', tone: 'warn' },
];

// Inter-branch transfers
const TRANSFERS = [
  { id: 'T-218', from: 'mikado', to: 'kohav', items: 8,  units: 24, status: 'pending',   tone: 'warn',   date: '23/05, 14:20', user: 'יעל א.' },
  { id: 'T-217', from: 'kohav',  to: 'mikado', items: 3, units: 12, status: 'in-transit', tone: 'accent', date: '23/05, 11:05', user: 'אבי כ.' },
  { id: 'T-216', from: 'mikado', to: 'kohav', items: 5,  units: 18, status: 'pending',   tone: 'warn',   date: '23/05, 09:42', user: 'יעל א.' },
  { id: 'T-215', from: 'kohav',  to: 'mikado', items: 12, units: 36, status: 'completed', tone: 'ok',     date: 'אתמול, 16:30', user: 'דני מ.' },
  { id: 'T-214', from: 'mikado', to: 'kohav', items: 4,  units: 8,  status: 'completed', tone: 'ok',     date: 'אתמול, 12:15', user: 'יעל א.' },
];

// Active supplier promotions
const PROMOTIONS = [
  { supplier: 'esprit',  title: 'הנחה 12% על כל הוודקות',   ends: '31/05', items: 14, discount: 12, type: 'category' },
  { supplier: 'hakerem', title: '1+1 על יקב טפרברג',          ends: '28/05', items: 6,  discount: 50, type: 'b1g1'    },
  { supplier: 'aviv',    title: 'הנחה 8% מעל ₪3,000',         ends: '15/06', items: 0,  discount: 8,  type: 'volume'  },
  { supplier: 'gold',    title: 'בונוס 5% במזומן',            ends: '30/06', items: 0,  discount: 5,  type: 'payment' },
  { supplier: 'wine_plus', title: '20% הנחה על ג׳ין נבחר',   ends: '05/06', items: 4,  discount: 20, type: 'category' },
  { supplier: 'tiroshlu', title: 'הנחה 10% על וויסקי סינגל מאלט', ends: '20/06', items: 8, discount: 10, type: 'category' },
];

// Past orders per supplier (history) — for the order builder
const PAST_ORDERS = {
  esprit: [
    { id: '#5102', date: '21/05/2026', total: 4820, items: [
      { sku: 'w001', qty: 12 }, { sku: 'w005', qty: 6 }, { sku: 'w010', qty: 18 },
      { sku: 'w017', qty: 4 }, { sku: 'w021', qty: 8 },
    ]},
    { id: '#5087', date: '07/05/2026', total: 3920, items: [
      { sku: 'w001', qty: 6 }, { sku: 'w012', qty: 12 }, { sku: 'w010', qty: 12 },
      { sku: 'w005', qty: 4 },
    ]},
    { id: '#5072', date: '24/04/2026', total: 5210, items: [
      { sku: 'w001', qty: 18 }, { sku: 'w005', qty: 8 }, { sku: 'w017', qty: 6 },
      { sku: 'w021', qty: 4 },
    ]},
  ],
  hakerem: [
    { id: '#5104', date: '22/05/2026', total: 5340, items: [
      { sku: 'w003', qty: 24 }, { sku: 'w007', qty: 12 }, { sku: 'w015', qty: 18 },
      { sku: 'w020', qty: 6 },
    ]},
    { id: '#5090', date: '10/05/2026', total: 4180, items: [
      { sku: 'w003', qty: 18 }, { sku: 'w015', qty: 12 }, { sku: 'w007', qty: 8 },
    ]},
  ],
  aviv: [
    { id: '#5103', date: '22/05/2026', total: 2980, items: [
      { sku: 'w002', qty: 6 }, { sku: 'w006', qty: 24 }, { sku: 'w016', qty: 12 },
    ]},
    { id: '#5088', date: '08/05/2026', total: 3650, items: [
      { sku: 'w006', qty: 36 }, { sku: 'w016', qty: 18 }, { sku: 'w022', qty: 6 },
    ]},
  ],
  gold: [
    { id: '#5105', date: '23/05/2026', total: 1870, items: [
      { sku: 'w004', qty: 24 }, { sku: 'w019', qty: 12 },
    ]},
  ],
  tiroshlu: [
    { id: '#5098', date: '18/05/2026', total: 1290, items: [
      { sku: 'w008', qty: 3 }, { sku: 'w013', qty: 4 },
    ]},
  ],
  wine_plus: [
    { id: '#5106', date: '23/05/2026', total: 3450, items: [
      { sku: 'w009', qty: 12 }, { sku: 'w011', qty: 6 }, { sku: 'w018', qty: 12 },
    ]},
  ],
};

// Last received shipments per supplier
const LAST_RECEIVED = {
  esprit:   { date: '15/05/2026', total: 4120, items: 5 },
  hakerem:  { date: '14/05/2026', total: 3890, items: 4 },
  aviv:     { date: '16/05/2026', total: 2740, items: 3 },
  gold:     { date: '12/05/2026', total: 1640, items: 2 },
  tiroshlu: { date: '11/05/2026', total: 1180, items: 2 },
  wine_plus:{ date: '17/05/2026', total: 2950, items: 3 },
};

const ACTIVITY = [
  { id: 1, type: 'in',   text: 'נקלטה הזמנה #5102 — 12 פריטים מאספיריט', time: 'לפני 12 דקות', user: 'יעל א.' },
  { id: 2, type: 'low',  text: 'מלאי שלילי: יקב טוליפ סיריה 2020 (מיקדו)', time: 'לפני 35 דקות', user: 'מערכת' },
  { id: 3, type: 'xfer', text: 'הועברו 24 יח׳ ממיקדו לכוכב הצפון', time: 'לפני שעה', user: 'דני מ.' },
  { id: 4, type: 'in',   text: 'אושר מבצע: הנחה 12% על וודקות (אספיריט)', time: 'לפני 3 שעות', user: 'יעל א.' },
  { id: 5, type: 'edit', text: 'עודכן מחיר צרכן: אבסולוט וודקה 1L', time: 'אתמול', user: 'דני מ.' },
];

// === Inventory value over time, broken down by supplier ===
// Nov 2025 → May 2026 (7 months). Each entry: month + value per supplier.
const INVENTORY_VALUE_BY_MONTH = [
  { m: 'נוב 2025', values: { esprit: 84200, hakerem: 52400, aviv: 68300, gold: 41200, tiroshlu: 29800, wine_plus: 47100 } },
  { m: 'דצמ 2025', values: { esprit: 92300, hakerem: 58100, aviv: 71200, gold: 38400, tiroshlu: 33600, wine_plus: 52400 } },
  { m: 'ינו 2026', values: { esprit: 88100, hakerem: 54200, aviv: 73800, gold: 36700, tiroshlu: 31200, wine_plus: 49300 } },
  { m: 'פבר 2026', values: { esprit: 81400, hakerem: 56300, aviv: 70100, gold: 39800, tiroshlu: 28500, wine_plus: 51800 } },
  { m: 'מרץ 2026', values: { esprit: 96200, hakerem: 61800, aviv: 75400, gold: 42100, tiroshlu: 35200, wine_plus: 54600 } },
  { m: 'אפר 2026', values: { esprit: 102400, hakerem: 64200, aviv: 78900, gold: 44800, tiroshlu: 36800, wine_plus: 58200 } },
  { m: 'מאי 2026', values: { esprit: 108600, hakerem: 67400, aviv: 82100, gold: 46200, tiroshlu: 38400, wine_plus: 61300 } },
];

Object.assign(window, {
  BRANCHES, CATEGORIES, SUPPLIERS, PRODUCTS, MONTHLY, DAILY_SAMPLE,
  ORDERS, TRANSFERS, PROMOTIONS, ACTIVITY, INVENTORY_VALUE_BY_MONTH,
  PAST_ORDERS, LAST_RECEIVED
});
