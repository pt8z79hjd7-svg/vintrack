// === Barcode scanner — real camera via html5-qrcode + manual input ===
// Requires: <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

const ScannerModal = ({ onClose, onFound, onAdd }) => {
  const [state, setState] = useState('init'); // init | scanning | found | notfound | manual | error
  const [scanned, setScanned] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  // חיפוש מוצר לפי ברקוד — גם ראשי וגם ייבוא מקביל
  const findProduct = useCallback((code) => {
    const norm = code.replace(/^0+/, '') || '0';
    const P = window.PRODUCTS || [];
    // חפש ב-sku (ברקוד ראשי)
    let p = P.find(x => x.sku === code || x.sku === norm);
    let usedParallel = false;
    // חפש ב-parallel.sku (ייבוא מקביל)
    if (!p) {
      p = P.find(x => x.parallel && (x.parallel.sku === code || x.parallel.sku === norm));
      if (p) usedParallel = true;
    }
    // חפש ב-extra_barcodes
    if (!p) {
      p = P.find(x => (x.extra_barcodes || []).some(eb => eb === code || eb === norm));
    }
    // ניסיון נוסף: הוסף/הסר אפסים מובילים
    if (!p) {
      const padded = code.padStart(13, '0');
      p = P.find(x => x.sku === padded || (x.parallel && x.parallel.sku === padded));
      if (p && !usedParallel) usedParallel = !!(p.parallel && p.parallel.sku === padded);
    }
    return { product: p, code, usedParallel };
  }, []);

  // הפעלת מצלמה — רץ פעם אחת ב-mount; cleanup רק ב-unmount
  useEffect(() => {
    if (!window.Html5Qrcode) {
      setErrMsg('ספריית הסריקה לא נטענה. נסה לרענן את הדף.');
      setState('error');
      return;
    }

    const startCamera = async () => {
      try {
        const scanner = new Html5Qrcode('scanner-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 120 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
          },
          (decoded) => {
            // נמצא ברקוד!
            const result = findProduct(decoded);
            setScanned(result);
            setState(result.product ? 'found' : 'notfound');
            // עצור מצלמה
            scanner.stop().catch(() => {});
          },
          () => {} // scan failure — ignore, keep trying
        );
        setState('scanning');
      } catch (err) {
        console.warn('Camera error:', err);
        if (String(err).includes('NotAllowedError') || String(err).includes('Permission')) {
          setErrMsg('לא ניתנה הרשאת מצלמה. אשר גישה למצלמה ונסה שוב, או הקלד ברקוד ידנית.');
        } else if (String(err).includes('NotFoundError')) {
          setErrMsg('לא נמצאה מצלמה במכשיר. הקלד ברקוד ידנית.');
        } else {
          setErrMsg('שגיאה בהפעלת מצלמה: ' + String(err).slice(0, 100));
        }
        setState('manual');
      }
    };

    // delay קצר כדי שה-DOM ייווצר
    const tid = setTimeout(startCamera, 300);
    return () => {
      clearTimeout(tid);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);  // ⚠ אין תלות ב-state — אחרת cleanup עוצר מצלמה כשמשתנה ל-'scanning'

  // ניקוי בסגירה
  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    onClose();
  };

  // חיפוש ידני
  const handleManualSearch = () => {
    const code = manualCode.trim();
    if (!code) return;
    const result = findProduct(code);
    setScanned(result);
    setState(result.product ? 'found' : 'notfound');
  };

  // סרוק שוב
  const tryAgain = () => {
    setScanned(null);
    setManualCode('');
    setState('init');
  };

  // בדוק אם מוצר חדש (חסר מחיר)
  const isNewProduct = scanned?.product && (!scanned.product.cost || scanned.product.cost <= 0 || !scanned.product.price || scanned.product.price <= 0);
  const approved = window.APPROVED_PRODUCTS || new Set();
  const isUnapproved = scanned?.product && !approved.has(scanned.product.sku);

  return (
    <div className="scrim" onClick={handleClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div className="scanner-header">
          <div className="row">
            <ICamera size={18} />
            <span style={{ fontWeight: 700 }}>סריקת ברקוד</span>
          </div>
          <button className="icon-btn" onClick={handleClose}><IClose size={16} /></button>
        </div>

        <div className="scanner-stage">
          {/* Camera viewfinder */}
          {(state === 'init' || state === 'scanning') && (
            <div className="scanner-camera" ref={containerRef}>
              <div id="scanner-reader" style={{ width: '100%', minHeight: 260 }} />
              {state === 'init' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: 14 }}>
                  מפעיל מצלמה...
                </div>
              )}
            </div>
          )}

          {/* שגיאה */}
          {state === 'error' && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              <div>{errMsg}</div>
            </div>
          )}

          {/* הקלדה ידנית */}
          {(state === 'manual' || state === 'scanning' || state === 'init') && (
            <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
              {errMsg && state === 'manual' && (
                <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>{errMsg}</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {state === 'scanning' ? 'או הקלד ברקוד ידנית:' : 'הקלד ברקוד:'}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9P]*"
                  placeholder="לדוגמה: 7290000000"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  style={{ flex: 1, fontSize: 16, padding: '10px 14px', direction: 'ltr', textAlign: 'left' }}
                  autoFocus={state === 'manual'}
                />
                <button className="btn btn-primary" onClick={handleManualSearch}
                        style={{ padding: '10px 20px', fontSize: 14 }}
                        disabled={!manualCode.trim()}>
                  חפש
                </button>
              </div>
            </div>
          )}

          {/* תוצאה — נמצא */}
          {state === 'found' && scanned?.product && (
            <div className="scanner-result" style={{ padding: 16 }}>
              <div className="row" style={{ marginBottom: 10, gap: 6 }}>
                <Badge tone="ok"><ICheck size={11} /> זוהה</Badge>
                {scanned.usedParallel && <Badge tone="default">ייבוא מקביל</Badge>}
                {isNewProduct && <Badge tone="warn">חסר מחיר</Badge>}
                {isUnapproved && <Badge tone="accent">ממתין לאישור</Badge>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{scanned.product.name}</div>
              <div className="mono-tiny" style={{ marginBottom: 8, direction: 'ltr', textAlign: 'left' }}>
                ברקוד: {scanned.code}
              </div>
              <div className="row" style={{ gap: 14, fontSize: 13, flexWrap: 'wrap' }}>
                <span>מיקדו: <strong>{scanned.product.stock?.mikado ?? 0}</strong></span>
                <span>כוכב: <strong>{scanned.product.stock?.kohav ?? 0}</strong></span>
                <span>סה״כ: <strong>{(scanned.product.stock?.mikado ?? 0) + (scanned.product.stock?.kohav ?? 0)}</strong></span>
                {scanned.product.price > 0 && <span>מחיר מכירה: <strong>₪{scanned.product.price.toFixed(0)}</strong></span>}
                {scanned.product.cost > 0 && <span>עלות: <strong>₪{scanned.product.cost.toFixed(0)}</strong></span>}
              </div>
              {/* רווח גולמי — (מחיר÷1.18) − עלות, צבע לפי יעד הרווח */}
              {scanned.product.price > 0 && scanned.product.cost > 0 && (() => {
                const net = scanned.product.price / 1.18;
                const profit = net - scanned.product.cost;
                const margin = net > 0 ? (profit / net) * 100 : 0;
                const target = (window.SETTINGS && Number(window.SETTINGS.profitTarget)) || 25;
                const col = margin >= target ? 'var(--ok)' : margin >= 0 ? 'var(--warn)' : 'var(--danger)';
                return (
                  <div className="row" style={{ gap: 14, fontSize: 13, marginTop: 8, paddingTop: 8,
                                                borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <span>רווח גולמי ליח׳: <strong style={{ color: col }}>₪{profit.toFixed(1)}</strong></span>
                    <span>מרווח: <strong style={{ color: col }}>{margin.toFixed(0)}%</strong>
                      <span className="muted" style={{ fontSize: 11 }}> (יעד {target}%)</span>
                    </span>
                  </div>
                );
              })()}
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                ספק: {scanned.product.supplier}
                {(() => {
                  const catLabel = (window.CATEGORIES || []).find(c => c.id === scanned.product.cat)?.label;
                  return catLabel ? ` · ${catLabel}` : null;
                })()}
              </div>
            </div>
          )}

          {/* תוצאה — לא נמצא */}
          {state === 'notfound' && (
            <div className="scanner-result" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--warn)', marginBottom: 4 }}>
                ברקוד לא נמצא במלאי
              </div>
              <div className="mono-tiny" style={{ marginBottom: 12, direction: 'ltr' }}>
                {scanned?.code}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                המוצר לא קיים במערכת. בדוק את הברקוד או הוסף מוצר חדש.
              </div>
            </div>
          )}
        </div>

        <div className="scanner-footer">
          {(state === 'scanning' || state === 'init') && (
            <button className="btn btn-ghost" onClick={handleClose}>ביטול</button>
          )}

          {state === 'found' && scanned?.product && (
            <>
              <button className="btn" onClick={tryAgain}>סרוק שוב</button>
              <button className="btn btn-primary" onClick={() => { onFound(scanned.product); handleClose(); }}>
                פתח כרטיס מוצר →
              </button>
            </>
          )}

          {state === 'notfound' && (
            <>
              <button className="btn" onClick={tryAgain}>סרוק שוב</button>
              <button className="btn" onClick={() => setState('manual')}>הקלד ברקוד אחר</button>
              {onAdd && (
                <button className="btn btn-primary" onClick={() => { onAdd(scanned?.code); handleClose(); }}>
                  + הוסף מוצר חדש
                </button>
              )}
            </>
          )}

          {(state === 'error' || state === 'manual') && (
            <>
              <button className="btn btn-ghost" onClick={handleClose}>סגור</button>
              <button className="btn" onClick={tryAgain}>נסה מצלמה שוב</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ScannerModal });
