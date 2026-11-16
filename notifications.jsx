// === 🔔 מרכז התראות — פעמון בכותרת ===
// מחושב בצד-לקוח מנתונים שכבר נטענו (מלאי, הזמנות, טריות) + שתי שורות-סיכום מהצינור:
//   settings['daily_coverage'].attention  — ימים חסרים/חלקיים מול הקופה
//   settings['alerts_live'].missed        — ת.מ. רכש שהוקלדה בלי הנחת ספק
// "נקרא" נשמר במכשיר (localStorage) לפי חתימת ההתראות — התראה שהשתנתה מדליקה שוב את הנקודה.
const NOTIF_SEEN_KEY = 'vt_alerts_seen';

function buildAlerts() {
  const P = window.PRODUCTS || [];
  const out = [];
  const now = Date.now();
  const hr = new Date(now).getHours();
  const sync = window.LAST_DATA_SYNC;
  if (sync && hr >= 9 && hr < 23 && now - sync > 45 * 60000) {
    out.push({ id: 'stale', n: Math.floor((now - sync) / 3600000), tone: 'danger', icon: '⏱',
      title: `הנתונים לא התעדכנו ${window.relTime(sync)}`,
      detail: 'ייתכן שהמחשב בחנות כבוי או ישן, או שהמחזור תקוע.' });
  }
  const cov = window.COVERAGE_ATTENTION || [];
  if (cov.length) {
    out.push({ id: 'coverage', n: cov.length, tone: 'danger', icon: '🧾',
      title: `${cov.length} ימים חסרים או חלקיים מול הקופה`,
      detail: 'המחזור החודשי נמוך מהקופה עד שהימים יורדו מחדש.',
      lines: cov.slice(-10).map((d) => String(d).split('-').reverse().join('/')) });
  }
  const negM = P.filter((p) => p.stock.mikado < 0).length;
  const negK = P.filter((p) => p.stock.kohav < 0).length;
  if (negM + negK > 0) {
    out.push({ id: 'neg', n: negM + negK, tone: 'warn', icon: '📉',
      title: `מלאי שלילי: מיקדו ${negM} · כוכב הצפון ${negK}`,
      detail: 'בדרך כלל רכש שלא הוקלד בקופה.', nav: 'analysis' });
  }
  const missed = (window.ALERTS_LIVE && window.ALERTS_LIVE.missed) || [];
  if (missed.length) {
    const gap = missed.reduce((s, x) => s + (x.gap || 0), 0);
    out.push({ id: 'missed', n: missed.length, tone: 'warn', icon: '🏷',
      title: `${missed.length} שורות רכש בלי הנחת ספק · ₪${Math.round(gap).toLocaleString('he-IL')}`,
      detail: 'לתקן את התעודה בקופה — ההתראה נסגרת לבד.',
      lines: missed.slice(0, 12).map((x) => `${x.supplier} · ${x.branch} · חשבונית ${x.ref2 || x.ref} · ${x.worker} · ${x.name} · ₪${Math.round(x.gap)}`) });
  }
  const approved = window.APPROVED_PRODUCTS || new Set();
  const noPrice = P.filter((p) => !approved.has(p.sku) && (!p.cost || p.cost <= 0 || !p.price || p.price <= 0)).length;
  if (noPrice) {
    out.push({ id: 'noprice', n: noPrice, tone: 'warn', icon: '🆕',
      title: `${noPrice} מוצרים בלי מחיר או עלות`, detail: 'ממתינים לאישור במוצרים חדשים.', nav: 'new-products' });
  }
  const fake = P.filter((p) => p.cost > 0 && p.price > 0 && p.total > 0 && Math.abs(p.price - p.cost * 1.18) < 0.05).length;
  if (fake) {
    out.push({ id: 'fake', n: fake, tone: 'info', icon: '💸',
      title: `${fake} מוצרים במלאי נמכרים במחיר עלות`, detail: 'מחיר המכירה שווה לעלות + מע"מ — חסר תמחור.', nav: 'dead-stock' });
  }
  const ord = (window.ORDERS || []).filter((o) => o.status !== 'completed').length;
  if (ord) out.push({ id: 'orders', n: ord, tone: 'info', icon: '🚚', title: `${ord} הזמנות פתוחות`, nav: 'orders' });
  const tr = (window.TRANSFERS || []).filter((x) => x.status === 'pending').length;
  if (tr) out.push({ id: 'transfers', n: tr, tone: 'info', icon: '🔁', title: `${tr} העברות ממתינות`, nav: 'transfers' });
  return out;
}
window.buildAlerts = buildAlerts;

const NotifBell = ({ onNav }) => {
  useLiveData();
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(NOTIF_SEEN_KEY) || ''; } catch (e) { return ''; } });
  const alerts = buildAlerts();
  const sig = alerts.map((a) => `${a.id}:${a.n}`).join('|');
  const unread = alerts.length > 0 && sig !== seen;
  const urgent = alerts.filter((a) => a.tone !== 'info').length;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setSeen(sig);
      try { localStorage.setItem(NOTIF_SEEN_KEY, sig); } catch (e) { /* מצב פרטי — בלי שמירה */ }
    }
  };
  const toneColor = { danger: 'var(--danger, #dc2626)', warn: 'var(--warn, #d97706)', info: 'var(--ink-3, #6b7280)' };
  return (
    <React.Fragment>
      <button className="icon-btn" title={alerts.length ? `${alerts.length} התראות` : 'אין התראות'} onClick={toggle}
              style={{ position: 'relative' }}>
        <IBell size={18} />
        {unread && <span className="dot" />}
      </button>
      {open && (
        <div onClick={() => setOpen(false)}
             style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.25)' }}>
          <div onClick={(e) => e.stopPropagation()}
               style={{ position: 'absolute', top: 56, insetInlineEnd: 8, width: 'min(420px, calc(100vw - 16px))',
                        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', background: 'var(--bg-elev, #fff)',
                        color: 'var(--ink, inherit)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.25)',
                        border: '1px solid var(--line, #e5e7eb)' }}>
            <div className="between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line, #e5e7eb)' }}>
              <div style={{ fontWeight: 700 }}>התראות{urgent ? ` · ${urgent} דורשות טיפול` : ''}</div>
              <button className="icon-btn" onClick={() => setOpen(false)} title="סגור" style={{ fontSize: 18 }}>×</button>
            </div>
            {alerts.length === 0 && (
              <div className="muted" style={{ padding: 28, textAlign: 'center', fontSize: 13 }}>אין התראות פתוחות ✓</div>
            )}
            {alerts.map((a) => {
              const exp = openId === a.id;
              return (
                <div key={a.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line, #e5e7eb)',
                                         borderInlineStart: `3px solid ${toneColor[a.tone]}` }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, lineHeight: '22px' }}>{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.title}</div>
                      {a.detail ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.detail}</div> : null}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {a.nav ? (
                          <button className="chip" onClick={() => { setOpen(false); onNav && onNav(a.nav); }}>פתח ›</button>
                        ) : null}
                        {a.lines && a.lines.length ? (
                          <button className="chip" onClick={() => setOpenId(exp ? null : a.id)}>{exp ? 'הסתר פירוט' : 'פירוט'}</button>
                        ) : null}
                      </div>
                      {exp && (
                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
                          {a.lines.map((l, i) => <div key={i} style={{ padding: '3px 0', borderTop: i ? '1px dashed var(--line, #e5e7eb)' : 0 }}>{l}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </React.Fragment>
  );
};
window.NotifBell = NotifBell;
