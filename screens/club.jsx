// === 🎫 חברי מועדון "יין בעיר" ===
// מקור: settings['club_live'] — שורת-סיכום אחת שהצינור (club_members.py) דורס בכל מחזור.
// חבר = קבלה שהקופאי שייך ללקוח עם קוד-לקוח אמיתי. סכומים כולל מע"מ (כפי שנגבו בקופה).
const CLUB_HEB_MONTHS = ['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];

const clubCsv = (rows, fname) => {
  const head = ['שם', 'קוד לקוח', 'ביקורים', 'קניות ₪', 'הנחה ₪', 'קנייה ראשונה', 'קנייה אחרונה', 'ימים מאז', 'מיקדו', 'כוכב הצפון', 'מוצרים מובילים'];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.name, r.code, r.visits, r.spend, r.disc, r.first, r.last, r.days, r.mikado, r.kohav, (r.top || []).join(' | ')].map(esc).join(','));
  const blob = new Blob(['﻿' + [head.map(esc).join(',')].concat(lines).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const Club = ({ activeBranch = 'both' }) => {
  const C = window.CLUB_LIVE;
  const [tab, setTab] = useState('top');
  const [q, setQ] = useState('');
  const [openCode, setOpenCode] = useState(null);
  if (!C || !C.months) {
    return (
      <div className="page">
        <Card>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>אין עדיין נתוני מועדון</div>
            <div style={{ fontSize: 13 }}>הנתון נכתב על-ידי המחזור האוטומטי — יופיע אחרי הסנכרון הבא.</div>
          </div>
        </Card>
      </div>
    );
  }
  const fmt = (v) => `₪${Math.round(v || 0).toLocaleString('he-IL')}`;
  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const T = C.totals || {};
  const keys = Object.keys(C.months).sort();
  const cur = C.months[C.current] || {};
  const capture = cur.receipts ? cur.member_receipts / cur.receipts * 100 : 0;
  const best = keys.reduce((b, k) => {
    const m = C.months[k];
    const p = m.receipts ? m.member_receipts / m.receipts * 100 : 0;
    return p > b.p ? { p: p, k: k } : b;
  }, { p: 0, k: '' });
  const mLabel = (k) => { const p = k.split('-'); return `${CLUB_HEB_MONTHS[Number(p[1]) - 1]} ${p[0].slice(2)}`; };
  const maxMem = Math.max(1, ...keys.map((k) => C.months[k].members || 0));
  const brOf = (r) => (activeBranch === 'mikado' ? r.mikado : activeBranch === 'kohav' ? r.kohav : r.visits);
  const list = (tab === 'top' ? (C.top || []) : (C.lapsed || []))
    .filter((r) => activeBranch === 'both' || brOf(r) > 0)
    .filter((r) => !q || (r.name || '').includes(q.trim()));
  const rule = C.lapsed_rule || { days: 60, min_visits: 3 };
  const kpi = (label, value, sub) => (
    <Card>
      <div style={{ padding: 14 }}>
        <div className="muted" style={{ fontSize: 12 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sub ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div> : null}
      </div>
    </Card>
  );

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>חברי מועדון</h1>
          <div className="muted" style={{ fontSize: 13 }}>קבלות ששויכו ללקוח בקופה · עודכן {C.updated}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kpi('חברים רשומים', (T.members || 0).toLocaleString('he-IL'), `${T.repeat || 0} חזרו לקנייה שנייה`)}
        {kpi('פעילים ב-90 יום', (T.active_90d || 0).toLocaleString('he-IL'), `${T.members ? Math.round(T.active_90d / T.members * 100) : 0}% מהחברים`)}
        {kpi('החודש', `${cur.members || 0} חברים`, `${cur.new || 0} חדשים · ${fmt(cur.member_revenue)}`)}
        {kpi('שיוך קבלות החודש', `${capture.toFixed(0)}%`, best.k ? `שיא: ${best.p.toFixed(0)}% ב${mLabel(best.k)}` : '')}
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <Card>
          <div style={{ padding: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>חודשי</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>חודש</th><th style={te}>חברים</th><th style={te}>חדשים</th><th style={te}>קבלות חבר</th>
                    <th style={te}>% מהקבלות</th><th style={te}>קניות</th><th style={te}>הנחה</th>
                    <th style={te}>מיקדו</th><th style={te}>כוכב הצפון</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.slice().reverse().map((k) => {
                    const m = C.months[k];
                    const b = m.branches || {};
                    const pct = m.receipts ? m.member_receipts / m.receipts * 100 : 0;
                    return (
                      <tr key={k}>
                        <td>
                          <div>{mLabel(k)}</div>
                          <div style={{ background: 'var(--line, #e5e7eb)', borderRadius: 3, height: 4, marginTop: 3, width: 70, overflow: 'hidden' }}>
                            <div style={{ width: `${(m.members || 0) / maxMem * 100}%`, height: '100%', background: 'var(--brand, #0d7377)' }} />
                          </div>
                        </td>
                        <td style={te}>{m.members}</td>
                        <td style={te}>{m.new}</td>
                        <td style={te}>{m.member_receipts}</td>
                        <td style={te}>{pct.toFixed(0)}%</td>
                        <td style={te}>{fmt(m.member_revenue)}</td>
                        <td style={te}>{fmt(m.member_discount)}</td>
                        <td style={te}>{(b.mikado || {}).receipts || 0}</td>
                        <td style={te}>{(b.kohav || {}).receipts || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              עד אפריל 2026 הנחות המועדון נרשמו על כרטיס כללי ("לקוח מועדון") בלי שם — לכן מעט חברים בחודשים האלה.
            </div>
          </div>
        </Card>

        {(C.workers || []).length > 0 && (
          <Card>
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>שיוך לחבר לפי עובד — {mLabel(C.current)}</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>כמה מהקבלות של כל עובד נרשמו על שם חבר מועדון.</div>
              <table className="table" style={{ width: '100%' }}>
                <thead><tr><th>עובד</th><th style={te}>קבלות</th><th style={te}>לחבר</th><th style={te}>%</th></tr></thead>
                <tbody>
                  {C.workers.map((w) => (
                    <tr key={w.name}>
                      <td>{w.name}</td>
                      <td style={te}>{w.receipts}</td>
                      <td style={te}>{w.member}</td>
                      <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{w.receipts ? Math.round(w.member / w.receipts * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card>
          <div style={{ padding: 14 }}>
            <div className="between" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div className="chips">
                <button className={`chip ${tab === 'top' ? 'active' : ''}`} onClick={() => setTab('top')}>⭐ מובילים (12 חודשים)</button>
                <button className={`chip ${tab === 'lapsed' ? 'active' : ''}`} onClick={() => setTab('lapsed')}>💤 לא חזרו</button>
              </div>
              <button className="chip" onClick={() => clubCsv(list, tab === 'top' ? 'club_top.csv' : 'club_lapsed.csv')}>⬇ ייצוא CSV</button>
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              {tab === 'top' ? 'לפי סכום קניות ב-12 החודשים האחרונים. לחיצה על שורה מציגה מוצרים מובילים.'
                             : `חברים עם ${rule.min_visits}+ ביקורים שלא קנו מעל ${rule.days} יום — שווה ליצור קשר.`}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם"
                   style={{ width: '100%', maxWidth: 280, padding: '8px 10px', marginBottom: 8, border: '1px solid var(--line, #d1d5db)', borderRadius: 8, font: 'inherit', background: 'transparent', color: 'inherit' }} />
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead><tr><th>חבר</th><th style={te}>ביקורים</th><th style={te}>קניות</th><th style={te}>הנחה</th><th style={te}>אחרונה</th></tr></thead>
                <tbody>
                  {list.map((r) => {
                    const open = openCode === r.code;
                    return (
                      <React.Fragment key={r.code}>
                        <tr onClick={() => setOpenCode(open ? null : r.code)} style={{ cursor: 'pointer' }}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.name || '—'}</div>
                            <div className="muted" style={{ fontSize: 11 }}>מיקדו {r.mikado} · כוכב הצפון {r.kohav}</div>
                          </td>
                          <td style={te}>{r.visits}</td>
                          <td style={te}>{fmt(r.spend)}</td>
                          <td style={te}>{fmt(r.disc)}</td>
                          <td style={te}>
                            <div>{r.last.slice(8, 10)}/{r.last.slice(5, 7)}/{r.last.slice(2, 4)}</div>
                            <div className="muted" style={{ fontSize: 11 }}>לפני {r.days} יום</div>
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={5} style={{ fontSize: 12, background: 'var(--bg-2, rgba(0,0,0,.03))' }}>
                              <div className="muted">חבר מאז {r.first.slice(8, 10)}/{r.first.slice(5, 7)}/{r.first.slice(0, 4)} · ממוצע לביקור {fmt(r.visits ? r.spend / r.visits : 0)}</div>
                              <div style={{ marginTop: 4 }}>{(r.top || []).length ? r.top.join(' · ') : 'אין פירוט מוצרים'}</div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {list.length === 0 && (
                    <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>אין תוצאות</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

window.Club = Club;
