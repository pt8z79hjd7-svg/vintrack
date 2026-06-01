// === מכירות עובדים — ניתוח לפי רמות מחיר (סכום חשבונית) ===

const BUCKETS_CONFIG = [
  { key: '0_100',   label: 'עד ₪100' },
  { key: '101_150', label: '₪101–150' },
  { key: '151_200', label: '₪151–200' },
  { key: '201_300', label: '₪201–300' },
  { key: '301_500', label: '₪301–500' },
  { key: '501_700', label: '₪501–700' },
  { key: '700_plus', label: '₪700+' },
];

// מיפוי שמות עובדים מהקופה → שם מאוחד (אותה ביאנקה רשומה אחרת בכל סניף)
const NAME_ALIAS = {
  'ביאנקה לאונה': 'ביאנקה',
};
const canonName = (n) => NAME_ALIAS[n] || n;

const EmployeeSales = ({ activeBranch = 'both' }) => {
  useLiveData();
  const [subTab, setSubTab] = useState('sales');   // 'sales' | 'payroll'
  const [period, setPeriod] = useState('30');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const _curMonthKey = new Date().toISOString().slice(0, 7);
  const [payrollMonth, setPayrollMonth] = useState(_curMonthKey);
  const [hoursLocal, setHoursLocal] = useState({});   // key emp.id → {reg, e125, e150}
  const [rateLocal, setRateLocal] = useState({});     // key emp.id → hourly_rate string
  const [savingEmp, setSavingEmp] = useState(null);

  const fmt = (v) => `₪${Math.round(v || 0).toLocaleString('he-IL')}`;
  const empRate = (emp) => ({ ...emp, hourly_rate: Number(rateLocal[emp.id] ?? emp.hourly_rate) || 0 });
  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const tc = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

  // ─── שכר: אכלוס שעות מהזיכרון לפי חודש נבחר ───
  React.useEffect(() => {
    if (subTab !== 'payroll') return;
    const init = {};
    (window.EMPLOYEES || []).forEach((emp) => {
      const h = (window.EMPLOYEE_HOURS || {})[`${emp.id}__${payrollMonth}`];
      init[emp.id] = {
        reg:  h?.regular_hours    ?? '',
        e125: h?.extra_hours_125  ?? '',
        e150: h?.extra_hours_150  ?? '',
      };
    });
    setHoursLocal(init);
  }, [subTab, payrollMonth, window.LAST_REFRESH]);
  // ─── שכר/שעה: אכלוס רק בפתיחת הלשונית / החלפת חודש (לא ב-refresh) ───
  React.useEffect(() => {
    if (subTab !== 'payroll') return;
    const rInit = {};
    (window.EMPLOYEES || []).forEach((emp) => {
      rInit[emp.id] = emp.hourly_rate != null ? String(emp.hourly_rate) : '';
    });
    setRateLocal(rInit);
  }, [subTab, payrollMonth]);

  // רשימת חודשים לבחירה — חודש נוכחי + 17 אחרונים מ-MONTHLY
  const payrollMonths = React.useMemo(() => {
    const set = new Set([_curMonthKey]);
    (window.MONTHLY || []).forEach(m => { if (m.month) set.add(m.month); });
    return Array.from(set).sort().reverse().slice(0, 18);
  }, [window.LAST_REFRESH]);

  const monthLabel = (mk) => {
    const [y, mo] = String(mk).split('-');
    const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return (names[(+mo) - 1] || mk) + ' ' + y;
  };

  // ─── שמירת שעות עובד יחיד ─── + עדכון monthly_finance.salaries ───
  const _savingRef = React.useRef(new Set());
  const savePayrollRow = async (emp) => {
    // הגנת race — חוסם קליק כפול לפני ש-React מעדכן את savingEmp
    if (_savingRef.current.has(emp.id)) return;
    _savingRef.current.add(emp.id);
    const local = hoursLocal[emp.id] || {};
    const payload = {
      employee_id: emp.id,
      month: payrollMonth,
      regular_hours:    Number(local.reg)  || 0,
      extra_hours_125:  Number(local.e125) || 0,
      extra_hours_150:  Number(local.e150) || 0,
      updated_at: new Date().toISOString(),
    };
    setSavingEmp(emp.id);
    try {
      const newRate = Number(rateLocal[emp.id]) || 0;
      if (newRate !== (Number(emp.hourly_rate) || 0)) {
        const { data: rData, error: rErr } = await window.sb.from('employees')
          .update({ hourly_rate: newRate, updated_at: new Date().toISOString() })
          .eq('id', emp.id).select('hourly_rate').single();
        if (rErr) throw rErr;
        if (!rData) throw new Error('העדכון לא נשמר — בדוק הרשאות בטבלת employees');
        emp.hourly_rate = newRate;
      }
      const { error } = await window.sb.from('employee_hours').upsert(payload, { onConflict: 'employee_id,month' });
      if (error) throw error;
      // עדכון מקומי כדי לא לחכות ל-refresh
      const key = `${emp.id}__${payrollMonth}`;
      if (!window.EMPLOYEE_HOURS) window.EMPLOYEE_HOURS = {};
      window.EMPLOYEE_HOURS[key] = { ...payload };

      // עדכון monthly_finance.salaries — סכום ברוטו של כל העובדים לחודש זה
      let grossSum = 0;
      (window.EMPLOYEES || []).forEach((e2) => {
        const h2 = window.EMPLOYEE_HOURS[`${e2.id}__${payrollMonth}`];
        if (!h2) return;
        const p2 = window.calcPayroll(empRate(e2), h2);
        grossSum += p2.total;
      });
      if (grossSum > 0) {
        const finRow = (window.FINANCE?.byMonth || {})[payrollMonth];
        const finPayload = { month: payrollMonth, salaries: Math.round(grossSum) };
        // שמור גם את שאר השדות אם קיימים
        if (finRow) {
          ['rent','electricity','water','arnona','management','other_expense','wolt','tenbis','external_sales','notes'].forEach(k => {
            if (finRow[k] != null) finPayload[k] = finRow[k];
          });
        }
        await window.sb.from('monthly_finance').upsert(finPayload, { onConflict: 'month' });
      }
      (window.toast?.success || alert)(`✓ שעות ${emp.name} נשמרו`);
      setTimeout(() => window.refreshData && window.refreshData('payroll-save'), 400);
    } catch (e) {
      (window.toast?.error || alert)('שגיאה: ' + (e?.message || e || 'לא ידוע'));
    } finally {
      setSavingEmp(null);
      _savingRef.current.delete(emp.id);
    }
  };

  const cutoffISO = useMemo(() => {
    const d = new Date();
    if (period === 'month') {
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    }
    d.setDate(d.getDate() - parseInt(period, 10));
    return d.toISOString().slice(0, 10);
  }, [period]);

  const { employees, daysWithData } = useMemo(() => {
    const empMap = {};
    let daysCount = 0;
    const branchHeb = activeBranch === 'mikado' ? 'מיקדו'
                    : activeBranch === 'kohav'  ? 'כוכב הצפון' : null;
    Object.entries(window.DAILY_DETAILS || {}).forEach(([date, dayData]) => {
      if (date < cutoffISO) return;
      const stats = dayData.cashier_stats;
      if (!stats || !stats.length) return;
      daysCount++;
      stats.forEach((emp) => {
        const cname = canonName(emp.name);
        if (!empMap[cname]) {
          empMap[cname] = {
            name: cname,
            branchSet: new Set(),
            total_receipts: 0,
            total_revenue: 0,
            total_profit: 0,
            buckets: Object.fromEntries(
              BUCKETS_CONFIG.map((b) => [b.key, { count: 0, revenue: 0, profit: 0 }])
            ),
          };
        }
        const e = empMap[cname];
        if (emp.branch) e.branchSet.add(emp.branch);
        e.total_receipts += emp.total_receipts || 0;
        e.total_revenue  += emp.total_revenue  || 0;
        e.total_profit   += emp.total_profit   || 0;
        BUCKETS_CONFIG.forEach((b) => {
          const src = emp.buckets?.[b.key];
          if (src) {
            e.buckets[b.key].count   += src.count   || 0;
            e.buckets[b.key].revenue += src.revenue || 0;
            e.buckets[b.key].profit  += src.profit  || 0;
          }
        });
      });
    });
    // סינון לפי סניף — נכלל אם העובד עבד שם לפחות יום אחד
    let employees = Object.values(empMap);
    if (branchHeb) {
      employees = employees.filter((e) => e.branchSet.has(branchHeb));
    }
    // המרת branchSet לתווית תצוגה
    employees = employees.map((e) => ({
      ...e,
      branch: e.branchSet.size > 1 ? 'שני סניפים' : (Array.from(e.branchSet)[0] || ''),
    }));
    employees.sort((a, b) => b.total_revenue - a.total_revenue);
    return { employees, daysWithData: daysCount };
  }, [cutoffISO, activeBranch, window.LAST_REFRESH]);

  const empDailyRows = useMemo(() => {
    if (!selectedEmp) return [];
    const rows = [];
    Object.entries(window.DAILY_DETAILS || {}).forEach(([date, dayData]) => {
      if (date < cutoffISO) return;
      const emp = (dayData.cashier_stats || []).find((e) => canonName(e.name) === selectedEmp);
      if (emp) rows.push({ date, ...emp, name: canonName(emp.name) });
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedEmp, cutoffISO, window.LAST_REFRESH]);

  const periods = [
    { v: '7',     label: '7 ימים' },
    { v: '30',    label: '30 ימים' },
    { v: 'month', label: 'חודש נוכחי' },
  ];

  const calcMargin = (profit, revenue) => {
    if (!revenue) return null;
    return (profit / (revenue / 1.18)) * 100;
  };
  const marginBadge = (m) => {
    if (m === null) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
    const cls = m >= 25 ? 'ok' : m >= 18 ? 'warn' : 'danger';
    return <span className={`badge ${cls}`}>{m.toFixed(1)}%</span>;
  };

  const totalRevAll = employees.reduce((s, e) => s + e.total_revenue, 0);
  const totalProfAll = employees.reduce((s, e) => s + e.total_profit, 0);
  const totalRcpAll  = employees.reduce((s, e) => s + e.total_receipts, 0);

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">דוחות</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>
            עובדים — {subTab === 'sales' ? 'מכירות' : 'שכר'}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {subTab === 'sales' ? (
              <>
                {employees.length} עובדים · {daysWithData} ימי נתונים
                {activeBranch !== 'both' && (
                  <span> · {activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'} (עובדים שעבדו בסניף; סכומים מאוחדים לכל הסניפים)</span>
                )}
              </>
            ) : (
              <>{(window.EMPLOYEES || []).length} עובדים פעילים · חודש: {monthLabel(payrollMonth)}</>
            )}
          </div>
        </div>
        <div className="chips">
          {subTab === 'sales' && periods.map((p) => (
            <button key={p.v} className={`chip ${period === p.v ? 'active' : ''}`}
                    onClick={() => setPeriod(p.v)}>{p.label}</button>
          ))}
          {subTab === 'payroll' && (
            <select className="select" value={payrollMonth}
                    onChange={e => setPayrollMonth(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
              {payrollMonths.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* בורר לשוניות */}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className={`chip ${subTab === 'sales' ? 'active' : ''}`} onClick={() => setSubTab('sales')}>
          📊 מכירות
        </button>
        <button className={`chip ${subTab === 'payroll' ? 'active' : ''}`} onClick={() => setSubTab('payroll')}>
          💰 שכר
        </button>
      </div>

      {/* ════════════ לשונית שכר ════════════ */}
      {subTab === 'payroll' && (() => {
        const emps = window.EMPLOYEES || [];
        if (!emps.length) {
          return (
            <Card>
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
                <IUsers size={40} style={{ opacity: 0.3, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>אין עובדים במערכת</div>
                <div style={{ fontSize: 13 }}>הוסף עובדים במסך הגדרות → ניהול עובדים.</div>
              </div>
            </Card>
          );
        }
        // חישובים לכל שורה
        const rows = emps.map((emp) => {
          const local = hoursLocal[emp.id] || {};
          const h = { regular_hours: local.reg, extra_hours_125: local.e125, extra_hours_150: local.e150 };
          const p = window.calcPayroll(empRate(emp), h);
          return { emp, h, p, hasInput: (Number(local.reg)||0) + (Number(local.e125)||0) + (Number(local.e150)||0) > 0 };
        });
        const sumGross = rows.reduce((a, r) => a + r.p.gross, 0);
        const sumAdd   = rows.reduce((a, r) => a + r.p.additions, 0);
        const sumTotal = rows.reduce((a, r) => a + r.p.total, 0);

        return (
          <Card title={`חישוב שכר — ${monthLabel(payrollMonth)}`}
                sub="הזן שעות לכל עובד · ברוטו + הפרשות מעסיק מחושב אוטומטית">
            <div className="table-wrap">
              <table className="tbl" style={{ minWidth: 920 }}>
                <thead>
                  <tr>
                    <th>עובד</th>
                    <th style={te}>שכר/שעה</th>
                    <th style={tc}>רגילות</th>
                    <th style={tc}>×1.25</th>
                    <th style={tc}>×1.5</th>
                    <th style={te}>ברוטו</th>
                    <th style={te}>הפרשות</th>
                    <th style={te}>עלות מעסיק</th>
                    <th style={tc}>שמור</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ emp, p, hasInput }) => {
                    const local = hoursLocal[emp.id] || {};
                    const tipParts = [
                      `פנסיה ₪${Math.round(p.pension)}`,
                      `פיצויים ₪${Math.round(p.severance)}`,
                      emp.include_fund ? `קרן השתלמות ₪${Math.round(p.fund)}` : null,
                      `ביטוח לאומי ₪${Math.round(p.bituach)}`,
                    ].filter(Boolean).join(' · ');
                    return (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 600 }}>
                          {emp.name}{emp.last_name ? ` ${emp.last_name}` : ''}
                        </td>
                        <td style={te}>
                          <input className="input" type="number" min="0" step="1"
                                 value={rateLocal[emp.id] ?? ''}
                                 onChange={e => setRateLocal(s => ({ ...s, [emp.id]: e.target.value }))}
                                 placeholder="₪/שעה"
                                 style={{ width: 75, padding: '4px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
                        </td>
                        <td style={tc}>
                          <input className="input" type="number" min="0" step="0.5" value={local.reg ?? ''}
                                 onChange={e => setHoursLocal(s => ({ ...s, [emp.id]: { ...s[emp.id], reg: e.target.value } }))}
                                 style={{ width: 70, padding: '4px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
                        </td>
                        <td style={tc}>
                          <input className="input" type="number" min="0" step="0.5" value={local.e125 ?? ''}
                                 onChange={e => setHoursLocal(s => ({ ...s, [emp.id]: { ...s[emp.id], e125: e.target.value } }))}
                                 style={{ width: 60, padding: '4px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
                        </td>
                        <td style={tc}>
                          <input className="input" type="number" min="0" step="0.5" value={local.e150 ?? ''}
                                 onChange={e => setHoursLocal(s => ({ ...s, [emp.id]: { ...s[emp.id], e150: e.target.value } }))}
                                 style={{ width: 60, padding: '4px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
                        </td>
                        <td style={{ ...te, fontWeight: 700 }}>{fmt(p.gross)}</td>
                        <td style={te} title={tipParts}>
                          <span style={{ color: 'var(--ink-2)', cursor: 'help', borderBottom: '1px dotted var(--ink-3)' }}>
                            {fmt(p.additions)}
                          </span>
                        </td>
                        <td style={{ ...te, fontWeight: 700, color: 'var(--danger)' }}>{fmt(p.total)}</td>
                        <td style={tc}>
                          <button className="btn btn-sm btn-primary"
                                  onClick={() => savePayrollRow(emp)}
                                  disabled={savingEmp === emp.id || !(Number(rateLocal[emp.id]) > 0)}
                                  title={!(Number(rateLocal[emp.id]) > 0) ? 'הזן שכר שעתי' : 'שמור'}>
                            {savingEmp === emp.id ? '…' : '💾'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--line)', background: 'var(--surface-2)' }}>
                    <td colSpan={5} style={{ fontWeight: 700 }}>סה״כ</td>
                    <td style={{ ...te, fontWeight: 700 }}>{fmt(sumGross)}</td>
                    <td style={{ ...te, fontWeight: 700 }}>{fmt(sumAdd)}</td>
                    <td style={{ ...te, fontWeight: 700, color: 'var(--danger)' }}>{fmt(sumTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="muted" style={{ fontSize: 12, padding: 14, lineHeight: 1.6 }}>
              💡 הזן שכר/שעה + שעות ולחץ שמור. שינוי שכר נשמר גם בכרטיס העובד.
              <br />הפרשות מעסיק (פנסיה/פיצויים/קרן/ב.ל.) מחושבות אוטומטית לפי הגדרות העובד.
            </div>
          </Card>
        );
      })()}

      {/* ════════════ לשונית מכירות (קוד קיים) ════════════ */}
      {subTab === 'sales' && (employees.length === 0 ? (
        <Card>
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
            <IUsers size={40} style={{ opacity: 0.3, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>אין נתוני עובדים לתקופה זו</div>
            <div style={{ fontSize: 13 }}>
              הנתונים מתמלאים אחרי ריצה אחת של <code>vintrack_auto_cycle.py</code> עם הגרסה המעודכנת.
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card title="סיכום לפי עובד" sub="לחץ שורה לפירוט יומי · מחיר = סכום חשבונית">
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 1060 }}>
                <thead>
                  <tr>
                    <th>עובד</th>
                    <th>סניף</th>
                    <th style={tc}>חשב׳</th>
                    <th style={te}>מחזור</th>
                    <th style={te}>רווח גולמי</th>
                    <th style={tc}>% רווח</th>
                    {BUCKETS_CONFIG.map((b) => (
                      <th key={b.key} style={tc}>{b.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const margin = calcMargin(emp.total_profit, emp.total_revenue);
                    const isSelected = selectedEmp === emp.name;
                    return (
                      <tr key={emp.name}
                          onClick={() => setSelectedEmp(isSelected ? null : emp.name)}
                          style={{ cursor: 'pointer', background: isSelected ? 'var(--accent-soft)' : '' }}>
                        <td style={{ fontWeight: 600 }}>{emp.name}</td>
                        <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{emp.branch}</td>
                        <td style={tc}>{emp.total_receipts}</td>
                        <td style={{ ...te, fontWeight: 600 }}>{fmt(emp.total_revenue)}</td>
                        <td style={{ ...te, color: 'var(--ok)' }}>{fmt(emp.total_profit)}</td>
                        <td style={tc}>{marginBadge(margin)}</td>
                        {BUCKETS_CONFIG.map((b) => {
                          const bkt = emp.buckets[b.key];
                          return (
                            <td key={b.key} style={tc}>
                              {bkt && bkt.count > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{bkt.count}</div>
                                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{fmt(bkt.revenue)}</div>
                                </div>
                              ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--line)', background: 'var(--surface-2)' }}>
                    <td colSpan={2} style={{ fontWeight: 700 }}>סה״כ</td>
                    <td style={tc}>{totalRcpAll}</td>
                    <td style={{ ...te, fontWeight: 700 }}>{fmt(totalRevAll)}</td>
                    <td style={{ ...te, color: 'var(--ok)', fontWeight: 700 }}>{fmt(totalProfAll)}</td>
                    <td style={tc}>{marginBadge(calcMargin(totalProfAll, totalRevAll))}</td>
                    {BUCKETS_CONFIG.map((b) => {
                      const tot = employees.reduce((s, e) => s + (e.buckets[b.key]?.count || 0), 0);
                      const rev = employees.reduce((s, e) => s + (e.buckets[b.key]?.revenue || 0), 0);
                      return (
                        <td key={b.key} style={tc}>
                          {tot > 0 ? (
                            <div>
                              <div style={{ fontWeight: 700 }}>{tot}</div>
                              <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{fmt(rev)}</div>
                            </div>
                          ) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {selectedEmp && empDailyRows.length > 0 && (
            <Card title={`פירוט יומי — ${selectedEmp}`} sub={`${empDailyRows.length} ימים`}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>תאריך</th>
                      <th>סניף</th>
                      <th style={tc}>חשב׳</th>
                      <th style={te}>מחזור</th>
                      <th style={te}>רווח גולמי</th>
                      <th style={tc}>% רווח</th>
                      <th style={tc}>ממוצע חשב׳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empDailyRows.map((row) => {
                      const m = calcMargin(row.total_profit, row.total_revenue);
                      const avg = row.total_receipts > 0
                        ? Math.round(row.total_revenue / row.total_receipts) : 0;
                      return (
                        <tr key={row.date}>
                          <td className="mono-tiny">{row.date}</td>
                          <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{row.branch}</td>
                          <td style={tc}>{row.total_receipts}</td>
                          <td style={{ ...te, fontWeight: 600 }}>{fmt(row.total_revenue)}</td>
                          <td style={{ ...te, color: 'var(--ok)' }}>{fmt(row.total_profit)}</td>
                          <td style={tc}>{marginBadge(m)}</td>
                          <td style={tc}>{fmt(avg)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ))}
    </div>
  );
};

window.EmployeeSales = EmployeeSales;
