// === Barcode scanner modal — camera view (mock) ===
// Production: integrate html5-qrcode or quagga2:
//   <script src="https://unpkg.com/html5-qrcode"></script>
//   new Html5Qrcode("reader").start({facingMode:"environment"}, {...},
//     (decoded) => { findProduct(decoded); }, () => {});
// Search must match BOTH main SKU and parallel.sku.

const ScannerModal = ({ onClose, onFound }) => {
  const [state, setState] = useState('scanning'); // scanning | found | notfound
  const [scanned, setScanned] = useState(null);

  // Simulate scan after delay
  useEffect(() => {
    if (state !== 'scanning') return;
    const timer = setTimeout(() => {
      // Randomly pick a product (sometimes a parallel-import sku)
      const useParallel = Math.random() > 0.6;
      const candidates = useParallel ? PRODUCTS.filter(p => p.parallel) : PRODUCTS;
      const p = candidates[Math.floor(Math.random() * candidates.length)];
      const code = useParallel ? p.parallel.sku : p.sku;
      const usedParallel = useParallel;
      setScanned({ product: p, code, usedParallel });
      setState('found');
    }, 2400);
    return () => clearTimeout(timer);
  }, [state]);

  const tryAgain = () => { setScanned(null); setState('scanning'); };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <div className="row">
            <ICamera size={18} />
            <span style={{ fontWeight: 700 }}>סריקת ברקוד</span>
          </div>
          <button className="icon-btn" onClick={onClose}><IClose size={16} /></button>
        </div>

        <div className="scanner-stage">
          {/* Camera viewfinder */}
          <div className="scanner-camera">
            <div className="scanner-blur" />
            <div className={`scanner-frame ${state}`}>
              <div className="scanner-frame-corners">
                <span className="c c-tl" /><span className="c c-tr" />
                <span className="c c-bl" /><span className="c c-br" />
              </div>
              {state === 'scanning' && <div className="scanner-laser" />}
              {state === 'found' && (
                <div className="scanner-checkmark">
                  <ICheck size={42} />
                </div>
              )}
            </div>
            <div className="scanner-overlay-text">
              {state === 'scanning' && 'הצמד את הברקוד למסגרת'}
              {state === 'found' && 'נמצא!'}
            </div>
          </div>

          {/* Result */}
          <div className="scanner-result">
            {state === 'scanning' && (
              <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 16 }}>
                סורק... תומך ב-EAN-13, EAN-8, Code-128
              </div>
            )}

            {state === 'found' && scanned && (
              <div>
                <div className="row" style={{ marginBottom: 10 }}>
                  <Badge tone="ok"><ICheck size={11} /> זוהה</Badge>
                  {scanned.usedParallel && (
                    <Badge tone="default"><ISplit size={11} /> ייבוא מקביל</Badge>
                  )}
                </div>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className="bottle-thumb">
                    <div className="bottle-thumb-cap" />
                    <div className="bottle-thumb-body" data-cat={scanned.product.cat} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{scanned.product.name}</div>
                    <div className="mono-tiny" style={{ marginTop: 2 }}>
                      ברקוד: {scanned.code}
                      {scanned.usedParallel && <span className="muted"> · ספק משני</span>}
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 10, fontSize: 12 }}>
                      <span>
                        מיקדו: <strong>{scanned.product.stock.mikado}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        כוכב: <strong>{scanned.product.stock.kohav}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        ₪<strong>{scanned.product.price.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="scanner-footer">
          {state === 'scanning' && (
            <>
              <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
              <button className="btn">הזן ברקוד ידנית</button>
            </>
          )}
          {state === 'found' && scanned && (
            <>
              <button className="btn" onClick={tryAgain}>סרוק שוב</button>
              <button className="btn btn-primary" onClick={() => { onFound(scanned.product); onClose(); }}>
                פתח כרטיס מוצר →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ScannerModal });
