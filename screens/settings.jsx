// === Settings — הגדרות גלובליות + min_stock להמלצות הזמנה ===
const Settings = ({ activeBranch = 'both' }) => {
  useLiveData();
  const [defaultMin, setDefaultMin] = useState(3);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ total: 0, withCustom: 0, defaultCount: 0 });

  // ─── הגדרות גלובליות: יעד רווח + מינ׳ לפי קטגוריה ───
  const S = window.SETTINGS || { profitTarget: 25, defaultMin: 3, categoryMin: {} };
  const cats = (window.CATEGORIES || []).filter(c => c.id !== 'all');
  const [profitTarget, setProfitTarget] = useState(S.profitTarget ?? 25);
  const [catMins, setCatMins] = useState({});
  const [savingPT, setSavingPT] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [showInclVat, setShowInclVat] = useState(S.showInclVat !== false);

  // טען סטטיסטיקה של מינימום נוכחי
  React.useEffect(() => {
    const P = window.PRODUCTS || [];
    const withCustom = P.filter(p => p.min_stock != null && p.min_stock !== 3).length;
    setStats({ total: P.length, withCustom, defaultCount: P.length - withCustom });
  }, []);

  // החל מינימום גלובלי על כל המוצרים שאין להם override
  const applyDefaultMin = async () => {
    if (!window.confirm(`לעדכן min_stock = ${defaultMin} לכל ${stats.total} המוצרים?`)) return;
    setBusy(true);
    try {
      const { error } = await window.sb.from('products')
        .update({ min_stock: Math.max(0, Number(defaultMin) || 0) })
        .neq('barcode', null);
      if (error) throw error;
      (window.toast?.success || alert)('✓ מינימום עודכן לכל המוצרים');
      setTimeout(() => window.refreshData && window.refreshData('settings'), 500);
    } catch (e) {
      (window.toast?.error || alert)('שגיאה: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // ספירת מוצרים מתחת לסף נוכחי
  const lowStockNow = React.useMemo(() => {
    const P = window.PRODUCTS || [];
    return P.filter(p => {
      const stock = activeBranch === 'mikado' ? p.stock.mikado
                  : activeBranch === 'kohav' ? p.stock.kohav
                  : p.stock.mikado + p.stock.kohav;
      return stock > 0 && stock < (p.min_stock ?? 3);
    }).length;
  }, [activeBranch]);

  // אכלוס ראשוני של שדות הקטגוריה + יעד הרווח מתוך SETTINGS
  React.useEffect(() => {
    const SS = window.SETTINGS || {};
    const cm = SS.categoryMin || {};
    const init = {};
    (window.CATEGORIES || []).filter(c => c.id !== 'all').forEach(c => {
      const v = cm[c.label] ?? cm[c.id];
      init[c.label] = (v != null ? v : '');
    });
    setCatMins(init);
    setProfitTarget(SS.profitTarget ?? 25);
    setShowInclVat(SS.showInclVat !== false);
  }, [window.LAST_REFRESH]);

  // שמירת הגדרה ב-Supabase (טבלת settings) + מראה ל-localStorage (fallback אם הטבלה חסרה)
  const saveSetting = async (key, value) => {
    try {
      const ls = JSON.parse(localStorage.getItem('vintrack_settings') || '{}');
      if (key === 'profit_target') ls.profitTarget = value;
      else if (key === 'category_min') ls.categoryMin = value;
      else if (key === 'default_min') ls.defaultMin = value;
      else if (key === 'show_incl_vat') ls.showInclVat = value;
      localStorage.setItem('vintrack_settings', JSON.stringify(ls));
    } catch { /* noop */ }
    const { error } = await window.sb.from('settings').upsert({ key, value }, { onConflict: 'key' });
    return error;
  };

  const saveProfitTarget = async () => {
    const v = Math.max(1, Math.min(99, Number(profitTarget) || 25));
    setSavingPT(true);
    const err = await saveSetting('profit_target', v);
    setSavingPT(false);
    if (window.SETTINGS) window.SETTINGS.profitTarget = v;
    if (err) (window.toast?.info || alert)('נשמר במכשיר זה. ליצירת טבלת settings בסופאבייס (שיתוף בין מכשירים) הרץ את missing_tables.sql.');
    else (window.toast?.success || alert)('✓ יעד רווח נשמר');
    setTimeout(() => window.refreshData && window.refreshData('settings-pt'), 400);
  };

  // מתג תצוגת מע"מ — מיידי (ללא צורך בכפתור שמירה)
  const toggleVat = async (val) => {
    setShowInclVat(val);
    if (window.SETTINGS) window.SETTINGS.showInclVat = val;
    // עדכון מיידי של ה-UI בכל המסכים
    window.dispatchEvent(new CustomEvent('vintrack:data-updated', { detail: { reason: 'vat-toggle', at: Date.now() } }));
    const err = await saveSetting('show_incl_vat', val);
    if (err) (window.toast?.info || alert)('נשמר במכשיר זה בלבד (טבלת settings חסרה בסופאבייס).');
    else (window.toast?.success || alert)(val ? '✓ מציג כולל מע״מ' : '✓ מציג ללא מע״מ');
  };

  const saveCatMins = async () => {
    const clean = {};
    Object.entries(catMins).forEach(([label, v]) => { const nn = Number(v); if (label && nn > 0) clean[label] = nn; });
    if (!Object.keys(clean).length) { (window.toast?.warn || alert)('הזן מינימום (>0) לפחות לקטגוריה אחת'); return; }
    const lines = Object.entries(clean).map(([k, v]) => `${k} → ${v}`).join('\n');
    if (!window.confirm(`לעדכן min_stock לפי קטגוריה?\n\n${lines}\n\nיוחל על כל המוצרים בקטגוריות אלו.`)) return;
    setSavingCat(true);
    try {
      const err = await saveSetting('category_min', clean);
      if (window.SETTINGS) window.SETTINGS.categoryMin = clean;
      let applied = 0;
      for (const [label, v] of Object.entries(clean)) {
        const { error } = await window.sb.from('products').update({ min_stock: v }).eq('category', label);
        if (!error) applied++;
      }
      (window.toast?.success || alert)(`✓ הוחל על ${applied} קטגוריות` + (err ? ' (הגדרות נשמרו מקומית)' : ''));
      setTimeout(() => window.refreshData && window.refreshData('settings-catmin'), 600);
    } catch (e) {
      (window.toast?.error || alert)('שגיאה: ' + e.message);
    } finally { setSavingCat(false); }
  };

  // ─── מבצעי לקוחות ───
  const promoCats = window.PROMO_CATEGORIES || [];
  const promoUsage = React.useMemo(() => {
    const m = {}; const map = window.PROMO_BY_BARCODE || {};
    Object.values(map).forEach(pr => { if (pr.id) m[pr.id] = (m[pr.id] || 0) + 1; });
    return m;
  }, [promoCats.length, window.LAST_REFRESH]);
  const [pName, setPName] = useState('');
  const [pUnits, setPUnits] = useState('');
  const [pTotal, setPTotal] = useState('');
  const [pBusy, setPBusy] = useState(false);

  // ─── הוצאות + הכנסות חוץ-קופה (monthly_finance) → רווח נטו ───
  const FIN_EXP_FIELDS = [
    { k: 'salaries', label: 'שכר עובדים' },
    { k: 'rent', label: 'שכירות' },
    { k: 'electricity', label: 'חשמל' },
    { k: 'water', label: 'מים' },
    { k: 'arnona', label: 'ארנונה' },
    { k: 'management', label: 'דמי ניהול' },
    { k: 'other_expense', label: 'הוצאות אחרות' },
  ];
  const FIN_INC_FIELDS = [
    { k: 'wolt', label: 'Wolt' },
    { k: 'tenbis', label: 'תן ביס' },
    { k: 'external_sales', label: 'מכירות חיצוניות' },
  ];
  const curMonthKey = new Date().toISOString().slice(0, 7);
  const [finMonth, setFinMonth] = useState(curMonthKey);
  const [finVals, setFinVals] = useState({});
  const [finBusy, setFinBusy] = useState(false);

  // רשימת חודשים לבחירה — מתוך MONTHLY (12 אחרונים), כולל החודש הנוכחי
  const finMonths = React.useMemo(() => {
    const set = new Set([curMonthKey]);
    (window.MONTHLY || []).forEach(m => { if (m.month) set.add(m.month); });
    return Array.from(set).sort().reverse().slice(0, 18);
  }, [window.LAST_REFRESH]);

  // אכלוס שדות מתוך FINANCE לפי החודש הנבחר
  React.useEffect(() => {
    const row = (window.FINANCE?.byMonth || {})[finMonth] || {};
    const init = {};
    FIN_EXP_FIELDS.concat(FIN_INC_FIELDS).forEach(f => {
      init[f.k] = (row[f.k] != null && row[f.k] !== 0) ? row[f.k] : '';
    });
    init.notes = row.notes || '';
    setFinVals(init);
  }, [finMonth, window.LAST_REFRESH]);

  // תצוגה מקדימה חיה: הוצאות, הכנסות, רווח גולמי (מ-MONTHLY), רווח נטו
  const finPreview = React.useMemo(() => {
    const exp = FIN_EXP_FIELDS.reduce((a, f) => a + (Number(finVals[f.k]) || 0), 0);
    const inc = FIN_INC_FIELDS.reduce((a, f) => a + (Number(finVals[f.k]) || 0), 0);
    const M = (window.MONTHLY || []).find(x => x.month === finMonth) || null;
    const gross = M ? M.profit : 0;
    const revenue = M ? M.total : 0;
    const net = gross + inc - exp;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    return { exp, inc, gross, revenue, net, margin, hasMonth: !!M };
  }, [finVals, finMonth, window.LAST_REFRESH]);

  const saveFinance = async () => {
    setFinBusy(true);
    const payload = { month: finMonth, notes: finVals.notes || '' };
    FIN_EXP_FIELDS.concat(FIN_INC_FIELDS).forEach(f => { payload[f.k] = Number(finVals[f.k]) || 0; });
    // fallback ל-localStorage (מכשיר ראשי לפני הרצת SQL)
    try {
      const ls = JSON.parse(localStorage.getItem('vintrack_finance') || '{}');
      ls[finMonth] = payload;
      localStorage.setItem('vintrack_finance', JSON.stringify(ls));
    } catch { /* noop */ }
    const { error } = await window.sb.from('monthly_finance').upsert(payload, { onConflict: 'month' });
    setFinBusy(false);
    if (error) (window.toast?.info || alert)('נשמר במכשיר זה. ליצירת טבלת monthly_finance בסופאבייס (שיתוף בין מכשירים) הרץ את missing_tables.sql.');
    else (window.toast?.success || alert)('✓ נתוני החודש נשמרו');
    setTimeout(() => window.refreshData && window.refreshData('finance-save'), 400);
  };

  const monthLabel = (mk) => {
    const [y, mo] = String(mk).split('-');
    const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return (names[(+mo) - 1] || mk) + ' ' + y;
  };

  const addPromoCat = async () => {
    const units = Number(pUnits) || 0, total = Number(pTotal) || 0;
    const name = pName.trim() || (units && total ? `${units} ב-${total}` : '');
    if (!units || !total || !name) { (window.toast?.warn || alert)('מלא שם, כמות יחידות ומחיר כולל'); return; }
    setPBusy(true);
    const { error } = await window.sb.from('promo_categories').insert({ name, units, price_total: total });
    setPBusy(false);
    if (error) { (window.toast?.error || alert)('יצירה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('✓ מבצע נוצר');
    setPName(''); setPUnits(''); setPTotal('');
    setTimeout(() => window.refreshData && window.refreshData('promo-cat-add'), 400);
  };

  const deletePromoCat = async (id, name, used) => {
    if (used > 0) { (window.toast?.warn || alert)(`לא ניתן למחוק — ${used} מוצרים משויכים ל"${name}". הסר אותם קודם.`); return; }
    if (!window.confirm(`למחוק את סוג המבצע "${name}"?`)) return;
    setPBusy(true);
    const { error } = await window.sb.from('promo_categories').delete().eq('id', id);
    setPBusy(false);
    if (error) { (window.toast?.error || alert)('מחיקה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)('המבצע נמחק');
    setTimeout(() => window.refreshData && window.refreshData('promo-cat-del'), 400);
  };

  // ─── ניהול עובדים ───
  const employees = window.EMPLOYEES || [];
  const [editingEmpId, setEditingEmpId] = useState(null);   // null = מצב חדש, אחרת id לעריכה
  const [empForm, setEmpForm] = useState({
    name: '', last_name: '', hourly_rate: '',
    pension_pct: 6.5, severance_pct: 8.33, fund_pct: 7.5, include_fund: true,
  });
  const [empBusy, setEmpBusy] = useState(false);

  const resetEmpForm = () => {
    setEditingEmpId(null);
    setEmpForm({ name: '', last_name: '', hourly_rate: '', pension_pct: 6.5, severance_pct: 8.33, fund_pct: 7.5, include_fund: true });
  };

  const startEditEmp = (emp) => {
    setEditingEmpId(emp.id);
    setEmpForm({
      name: emp.name || '', last_name: emp.last_name || '',
      hourly_rate: emp.hourly_rate ?? '',
      pension_pct: emp.pension_pct ?? 6.5,
      severance_pct: emp.severance_pct ?? 8.33,
      fund_pct: emp.fund_pct ?? 7.5,
      include_fund: emp.include_fund !== false,
    });
  };

  const saveEmp = async () => {
    if (!empForm.name?.trim()) { (window.toast?.warn || alert)('הזן שם פרטי'); return; }
    setEmpBusy(true);
    const payload = {
      name: empForm.name.trim(),
      last_name: (empForm.last_name || '').trim(),
      hourly_rate: Number(empForm.hourly_rate) || 0,
      pension_pct: Number(empForm.pension_pct) || 0,
      severance_pct: Number(empForm.severance_pct) || 0,
      fund_pct: Number(empForm.fund_pct) || 0,
      include_fund: !!empForm.include_fund,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editingEmpId) {
      ({ error } = await window.sb.from('employees').update(payload).eq('id', editingEmpId));
    } else {
      ({ error } = await window.sb.from('employees').insert(payload));
    }
    setEmpBusy(false);
    if (error) { (window.toast?.error || alert)('שמירה נכשלה: ' + error.message); return; }
    (window.toast?.success || alert)(editingEmpId ? '✓ עובד עודכן' : '✓ עובד נוסף');
    resetEmpForm();
    setTimeout(() => window.refreshData && window.refreshData('emp-save'), 400);
  };

  const toggleEmpActive = async (emp) => {
    setEmpBusy(true);
    const { error } = await window.sb.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
    setEmpBusy(false);
    if (error) { (window.toast?.error || alert)('שגיאה: ' + error.message); return; }
    setTimeout(() => window.refreshData && window.refreshData('emp-toggle'), 400);
  };

  return (
    <div className="page">
      <div className="between">
        <div>
          <div className="crumbs">הגדרות מערכת</div>
          <div className="page-title" style={{ fontSize: 22, marginTop: 4 }}>הגדרות</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            מינימום מלאי גלובלי, התראות, ופרמטרים שמשפיעים על המלצות הזמנה
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon"><IBox size={16} /></span>סה״כ מוצרים</div>
          <div className="kpi-value">{stats.total.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">פעילים במערכת</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon"><ISettings size={16} /></span>מוצרים עם min_stock מותאם</div>
          <div className="kpi-value">{stats.withCustom.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">{stats.defaultCount.toLocaleString('he-IL')} עם ברירת מחדל</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-icon danger"><IAlert size={16} /></span>מתחת לסף עכשיו</div>
          <div className="kpi-value">{lowStockNow.toLocaleString('he-IL')}</div>
          <div className="kpi-foot">{activeBranch === 'both' ? 'שני הסניפים' : (activeBranch === 'mikado' ? 'מיקדו' : 'כוכב')}</div>
        </div>
      </div>

      {/* מינימום מלאי גלובלי */}
      <Card
        title="מינימום מלאי גלובלי"
        sub="קובע את הסף להתראת 'יש להזמין' לכל מוצר שאין לו ערך מותאם אישית"
      >
        <div style={{ padding: 18 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="muted" style={{ fontSize: 13 }}>מינימום ברירת מחדל (יחידות):</label>
            <input className="input" type="number" min="0" step="1" value={defaultMin}
                   onChange={(e) => setDefaultMin(+e.target.value)}
                   style={{ width: 100, fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '6px 10px' }} />
            <button className="btn btn-primary" onClick={applyDefaultMin} disabled={busy}>
              {busy ? 'מחיל…' : 'החל על כל המוצרים'}
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            ⚠ פעולה זו תדרוס את ה-min_stock של <b>כל המוצרים</b> ({stats.total.toLocaleString('he-IL')}).
            <br />
            כדי לקבוע מינימום למוצר ספציפי: כרטיסיית המוצר → ערוך → שדה "מינימום מלאי להתראה".
          </div>
        </div>
      </Card>

      {/* יעד רווח גולמי */}
      <Card title="🎯 יעד רווח גולמי" sub="הסף לצביעת המרווח (ירוק/כתום) בכל המסכים — דשבורד, פס עליון, סיכומים">
        <div style={{ padding: 18 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="muted" style={{ fontSize: 13 }}>יעד מרווח גולמי (%):</label>
            <input className="input" type="number" min="1" max="99" step="1" value={profitTarget}
                   onChange={(e) => setProfitTarget(e.target.value)}
                   style={{ width: 100, fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '6px 10px' }} />
            <button className="btn btn-primary" onClick={saveProfitTarget} disabled={savingPT}>
              {savingPT ? 'שומר…' : 'שמור יעד'}
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            ברירת מחדל 25%. משפיע על צביעת ה-KPI וסימון ✓/יעד בכל המסכים.
          </div>
        </div>
      </Card>

      {/* תצוגת מע״מ — מתג גלובלי לדשבורד וסיכומים */}
      <Card title="👁 תצוגת מע״מ" sub="הצג את המחזורים כולל מע״מ (כמו בקופה) או ללא מע״מ (נטו) — משפיע על דשבורד וסיכומים">
        <div style={{ padding: 18 }}>
          <div className="row" style={{ gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="row" style={{ gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={showInclVat}
                     onChange={(e) => toggleVat(e.target.checked)}
                     style={{ width: 20, height: 20, cursor: 'pointer' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {showInclVat ? '✓ מציג כולל מע״מ (כמו בקופה)' : '○ מציג ללא מע״מ (נטו)'}
              </span>
            </label>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            ברירת מחדל: כולל מע״מ — מתאים להשוואה ישירה לסכומים שמוצגים ב-CashOnTab.<br />
            ההגדרה נשמרת ב-Supabase ומשותפת בין כל המכשירים. שינוי מיידי — אין צורך לרענן.
          </div>
        </div>
      </Card>

      {/* מלאי מינימום לפי קטגוריה */}
      <Card title="📦 מלאי מינימום לפי קטגוריה" sub="סף הזמנה אוטומטי לכל מוצר בקטגוריה (וויסקי, יין…) — מאכלס את min_stock">
        <div style={{ padding: 18 }}>
          {cats.length ? (
            <div className="cat-min-grid">
              {cats.map(c => {
                const cnt = (window.PRODUCTS || []).filter(p => p.catLabel === c.label).length;
                return (
                  <div key={c.id} className="cat-min-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{cnt} מוצרים</div>
                    </div>
                    <input className="input" type="number" min="0" step="1"
                           value={catMins[c.label] ?? ''} placeholder={String(S.defaultMin ?? 3)}
                           onChange={(e) => setCatMins(m => ({ ...m, [c.label]: e.target.value }))}
                           style={{ width: 72, textAlign: 'center', fontWeight: 700, padding: '6px 8px' }} />
                  </div>
                );
              })}
            </div>
          ) : <div className="muted" style={{ fontSize: 13 }}>אין קטגוריות עדיין — רענן נתונים.</div>}
          <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={saveCatMins} disabled={savingCat}>
              {savingCat ? 'מחיל…' : 'שמור והחל על המוצרים'}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>קטגוריות ריקות — נשארות עם הסף הקודם.</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            הערך מוחל על <b>min_stock</b> של כל מוצר בקטגוריה. הצינור האוטומטי שומר ערכים אלו (כל ערך ≠ 3 = עריכה ידנית).
          </div>
        </div>
      </Card>

      {/* ניהול מבצעי לקוחות */}
      <Card title="🏷️ מבצעי לקוחות" sub="סוגי מבצעי מכירה (3 ב-100, 3 ב-120…) — לשיוך למוצרים בכרטיס המוצר">
        <div style={{ padding: 18 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>
                <th>מבצע</th>
                <th style={{ textAlign: 'end' }}>יחידות</th>
                <th style={{ textAlign: 'end' }}>מחיר כולל</th>
                <th style={{ textAlign: 'end' }}>ליחידה</th>
                <th style={{ textAlign: 'end' }}>משויכים</th>
                <th></th>
              </tr></thead>
              <tbody>
                {promoCats.map(c => {
                  const used = promoUsage[c.id] || 0;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ textAlign: 'end' }}>{c.units}</td>
                      <td style={{ textAlign: 'end' }}>₪{c.price_total}</td>
                      <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--accent-strong)' }}>₪{c.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: 'end' }}>{used || '—'}</td>
                      <td style={{ textAlign: 'end' }}>
                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                                onClick={() => deletePromoCat(c.id, c.name, used)} disabled={pBusy}>מחק</button>
                      </td>
                    </tr>
                  );
                })}
                {!promoCats.length && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>אין מבצעים — הוסף למטה</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>שם</div>
              <input className="input" value={pName} placeholder="3 ב-120"
                     onChange={e => setPName(e.target.value)} style={{ width: 110, padding: '6px 8px' }} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>כמות יח׳</div>
              <input className="input" type="number" value={pUnits} placeholder="3"
                     onChange={e => setPUnits(e.target.value)} style={{ width: 70, padding: '6px 8px' }} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>מחיר כולל ₪</div>
              <input className="input" type="number" value={pTotal} placeholder="120"
                     onChange={e => setPTotal(e.target.value)} style={{ width: 90, padding: '6px 8px' }} />
            </div>
            <button className="btn btn-primary" onClick={addPromoCat} disabled={pBusy}>{pBusy ? '…' : '+ הוסף מבצע'}</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            כדי לשייך יין למבצע: כרטיסיית המוצר → קטע "🏷️ מבצע לקוחות" → בחר מבצע → שמור.
            <br />המחיר ליחידה והרווח האמיתי מחושבים אוטומטית ומופיעים במכירות ובניתוח.
          </div>
        </div>
      </Card>

      {/* הוצאות + הכנסות חוץ-קופה → רווח נטו */}
      <Card title="💰 הוצאות חודשיות + הכנסות חוץ-קופה" sub="הזנה ידנית — מחושב רווח נטו (רווח גולמי + הכנסות חוץ-קופה − הוצאות)">
        <div style={{ padding: 18 }}>
          {/* בורר חודש */}
          <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <label className="muted" style={{ fontSize: 13 }}>חודש:</label>
            <select className="input" value={finMonth} onChange={(e) => setFinMonth(e.target.value)}
                    style={{ width: 180, padding: '6px 10px', fontWeight: 600 }}>
              {finMonths.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
            </select>
          </div>

          {/* הוצאות */}
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--danger)' }}>הוצאות (₪)</div>
          <div className="cat-min-grid">
            {FIN_EXP_FIELDS.map(f => (
              <div key={f.k} className="cat-min-row">
                <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13 }}>{f.label}</div>
                <input className="input" type="number" min="0" step="1"
                       value={finVals[f.k] ?? ''} placeholder="0"
                       onChange={(e) => setFinVals(v => ({ ...v, [f.k]: e.target.value }))}
                       style={{ width: 110, textAlign: 'center', fontWeight: 700, padding: '6px 8px' }} />
              </div>
            ))}
          </div>

          {/* הכנסות חוץ-קופה */}
          <div style={{ fontWeight: 700, fontSize: 13, margin: '16px 0 8px', color: 'var(--accent-strong)' }}>הכנסות חוץ-קופה (₪)</div>
          <div className="cat-min-grid">
            {FIN_INC_FIELDS.map(f => (
              <div key={f.k} className="cat-min-row">
                <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13 }}>{f.label}</div>
                <input className="input" type="number" min="0" step="1"
                       value={finVals[f.k] ?? ''} placeholder="0"
                       onChange={(e) => setFinVals(v => ({ ...v, [f.k]: e.target.value }))}
                       style={{ width: 110, textAlign: 'center', fontWeight: 700, padding: '6px 8px' }} />
              </div>
            ))}
          </div>

          {/* תצוגה מקדימה — רווח נטו */}
          <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2, rgba(0,0,0,0.03))', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div><div className="muted" style={{ fontSize: 11 }}>רווח גולמי</div>
              <div style={{ fontWeight: 700 }}>{finPreview.hasMonth ? '₪' + Math.round(finPreview.gross).toLocaleString('he-IL') : '—'}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>+ הכנסות חוץ-קופה</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-strong)' }}>₪{Math.round(finPreview.inc).toLocaleString('he-IL')}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>− הוצאות</div>
              <div style={{ fontWeight: 700, color: 'var(--danger)' }}>₪{Math.round(finPreview.exp).toLocaleString('he-IL')}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>= רווח נטו</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: finPreview.net >= 0 ? 'var(--success, #0a7a55)' : 'var(--danger)' }}>₪{Math.round(finPreview.net).toLocaleString('he-IL')}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>רווח נטו %</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: finPreview.net >= 0 ? 'var(--success, #0a7a55)' : 'var(--danger)' }}>{finPreview.hasMonth ? finPreview.margin.toFixed(1) + '%' : '—'}</div></div>
          </div>

          <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={saveFinance} disabled={finBusy}>
              {finBusy ? 'שומר…' : 'שמור נתוני חודש'}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>רווח גולמי ומחזור נמשכים אוטומטית מהסיכום החודשי.</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            💡 שכר עובדים — אם הוזנו שעות במסך "עובדים → שכר", השדה <b>"שכר עובדים"</b> ידרס אוטומטית בעלות מעסיק האמיתית.
          </div>
        </div>
      </Card>

      {/* ניהול עובדים */}
      <Card title="👥 ניהול עובדים" sub="שכר שעתי + הפרשות מעסיק ברירת מחדל לכל עובד">
        <div style={{ padding: 18 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>משפחה</th>
                  <th style={{ textAlign: 'end' }}>שכר/שעה</th>
                  <th style={{ textAlign: 'center' }}>פנסיה%</th>
                  <th style={{ textAlign: 'center' }}>פיצויים%</th>
                  <th style={{ textAlign: 'center' }}>קרן%</th>
                  <th style={{ textAlign: 'center' }}>פעיל</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.length ? employees.map(emp => (
                  <tr key={emp.id} style={editingEmpId === emp.id ? { background: 'var(--accent-soft)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{emp.name}</td>
                    <td>{emp.last_name || '—'}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                      {emp.hourly_rate ? `₪${Number(emp.hourly_rate).toFixed(2)}` : <span className="muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{Number(emp.pension_pct ?? 6.5)}%</td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{Number(emp.severance_pct ?? 8.33)}%</td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {emp.include_fund ? `${Number(emp.fund_pct ?? 7.5)}%` : <span className="muted">לא</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${emp.is_active ? 'ok' : ''}`}>{emp.is_active ? 'כן' : 'לא'}</span>
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => startEditEmp(emp)} disabled={empBusy}>ערוך</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => toggleEmpActive(emp)} disabled={empBusy}
                              style={{ color: emp.is_active ? 'var(--danger)' : 'var(--ok)' }}>
                        {emp.is_active ? 'השבת' : 'הפעל'}
                      </button>
                    </td>
                  </tr>
                )) : <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>אין עובדים — הוסף למטה</td></tr>}
              </tbody>
            </table>
          </div>

          {/* טופס הוספה/עריכה */}
          <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2, rgba(0,0,0,0.03))', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              {editingEmpId ? '✏ עריכת עובד' : '+ עובד חדש'}
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>שם פרטי *</div>
                <input className="input" value={empForm.name}
                       onChange={e => setEmpForm(v => ({ ...v, name: e.target.value }))}
                       style={{ width: 110, padding: '6px 8px' }} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>שם משפחה</div>
                <input className="input" value={empForm.last_name}
                       onChange={e => setEmpForm(v => ({ ...v, last_name: e.target.value }))}
                       style={{ width: 110, padding: '6px 8px' }} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>שכר/שעה ₪</div>
                <input className="input" type="number" step="0.5" value={empForm.hourly_rate}
                       onChange={e => setEmpForm(v => ({ ...v, hourly_rate: e.target.value }))}
                       style={{ width: 90, padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>פנסיה %</div>
                <input className="input" type="number" step="0.1" value={empForm.pension_pct}
                       onChange={e => setEmpForm(v => ({ ...v, pension_pct: e.target.value }))}
                       style={{ width: 70, padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>פיצויים %</div>
                <input className="input" type="number" step="0.01" value={empForm.severance_pct}
                       onChange={e => setEmpForm(v => ({ ...v, severance_pct: e.target.value }))}
                       style={{ width: 70, padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>קרן %</div>
                <input className="input" type="number" step="0.1" value={empForm.fund_pct}
                       onChange={e => setEmpForm(v => ({ ...v, fund_pct: e.target.value }))}
                       style={{ width: 70, padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }}
                       disabled={!empForm.include_fund} />
              </div>
              <label className="row" style={{ gap: 6, cursor: 'pointer', alignItems: 'center', padding: '6px 0' }}>
                <input type="checkbox" checked={!!empForm.include_fund}
                       onChange={e => setEmpForm(v => ({ ...v, include_fund: e.target.checked }))} />
                <span style={{ fontSize: 12 }}>כלל קרן השתלמות</span>
              </label>
              <button className="btn btn-primary" onClick={saveEmp} disabled={empBusy}>
                {empBusy ? '...שומר' : (editingEmpId ? 'עדכן' : 'הוסף')}
              </button>
              {editingEmpId && (
                <button className="btn btn-ghost" onClick={resetEmpForm} disabled={empBusy}>ביטול</button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
              ברירות מחדל לפי חוק ישראלי 2026: פנסיה מעסיק 6.5% · פיצויים 8.33% · קרן השתלמות 7.5% (אם נכלל).
              <br />ביטוח לאומי מעסיק מחושב אוטומטית במדרגות (3.55% עד ₪7,522 · 7.6% מעל) במסך השכר.
            </div>
          </div>
        </div>
      </Card>

      {/* פעולות תחזוקה */}
      <Card title="פעולות תחזוקה" sub="הורדה / רענון מיידיים">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => {
            if (window.requestFreshSync) window.requestFreshSync('settings-fresh');
            else window.refreshData('manual');
          }}>
            📥 הורד דוח טרי מ-CashOnTab ועדכן (30-60 שניות)
          </button>
          <button className="btn" onClick={() => {
            window.refreshData('settings-soft');
            (window.toast?.info || alert)('רענון נתונים מסופאבייס...');
          }}>
            ↻ רענן מסופאבייס בלבד (מהיר, ~2 שניות — בלי הורדה חדשה)
          </button>
          <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
            <b>"הורד דוח טרי"</b> = שולח בקשה למחשב, שמריץ את המחזור: הורדה מ-CashOnTab → ניתוח → דחיפה לסופאבייס → רענון.
            <br />
            <b>"רענן מסופאבייס"</b> = רק מטעין את מה שכבר שמור בסופאבייס (בלי הורדה חדשה).
          </div>
        </div>
      </Card>

      {/* מידע מערכת */}
      <Card title="פרטי מערכת" sub="לשימוש בעתיד / לתמיכה">
        <div style={{ padding: 18, fontSize: 13 }}>
          <table className="tbl" style={{ width: '100%' }}>
            <tbody>
              <tr><td className="muted">URL</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{window.location.href}</td></tr>
              <tr><td className="muted">Supabase Project</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>clfctpetgnydfwyjsbuo</td></tr>
              <tr><td className="muted">תזמון אוטומטי</td><td>כל 5 דק׳ · 09:00 – 22:00 (Windows Task Scheduler)</td></tr>
              <tr><td className="muted">עדכון אחרון של נתונים</td><td>{window.LAST_REFRESH ? new Date(window.LAST_REFRESH).toLocaleString('he-IL') : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
window.Settings = Settings;
