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

const EmployeeSales = ({ activeBranch = 'both' }) => {
  useLiveData();
  const [period, setPeriod] = useState('30');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const fmt = (v) => `₪${Math.round(v || 0).toLocaleString('he-IL')}`;
  const te = { textAlign: 'end', fontVariantNumeric: 'tabular-nums' };
  const tc = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

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
    Object.entries(window.DAILY_DETAILS || {}).forEach(([date, dayData]) => {
      if (date < cutoffISO) return;
      const stats = dayData.cashier_stats;
      if (!stats || !stats.length) return;
      daysCount++;
      stats.forEach((emp) => {
        const branchHeb = activeBranch === 'mikado' ? 'מיקדו'
                        : activeBranch === 'kohav'  ? 'כוכב הצפון' : null;
        if (branchHeb && emp.branch !== branchHeb) return;
        if (!empMap[emp.name]) {
          empMap[emp.name] = {
            name: emp.name,
            branch: emp.branch || '',
            total_receipts: 0,
            total_revenue: 0,
            total_profit: 0,
            buckets: Object.fromEntries(
              BUCKETS_CONFIG.map((b) => [b.key, { count: 0, revenue: 0, profit: 0 }])
            ),
          };
        }
        const e = empMap[emp.name];
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
    const employees = Object.values(empMap).sort((a, b) => b.total_revenue - a.total_revenue);
    return { employees, daysWithData: daysCount };
  }, [cutoffISO, activeBranch, window.LAST_REFRESH]);

  const empDailyRows = useMemo(() => {
    if (!selectedEmp) return [];
    const rows = [];
    Object.entries(window.DAILY_DETAILS || {}).forEach(([date, dayData]) => {
      if (date < cutoffISO) return;
      const emp = (dayData.cashier_stats || []).find((e) => e.name === selectedEmp);
      if (emp) rows.push({ date, ...emp });
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
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>מכירות עובדים</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {employees.length} עובדים · {daysWithData} ימי נתונים
            {activeBranch !== 'both' && ` · ${activeBranch === 'mikado' ? 'מיקדו' : 'כוכב הצפון'}`}
          </div>
        </div>
        <div className="chips">
          {periods.map((p) => (
            <button key={p.v} className={`chip ${period === p.v ? 'active' : ''}`}
                    onClick={() => setPeriod(p.v)}>{p.label}</button>
          ))}
        </div>
      </div>

      {employees.length === 0 ? (
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
      )}
    </div>
  );
};

window.EmployeeSales = EmployeeSales;
