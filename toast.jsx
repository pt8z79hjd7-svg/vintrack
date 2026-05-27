// === Toast notifications + refresh indicator + skeleton ===
// מערכת הודעות גלובלית במקום window.alert(). שימוש: window.toast.success("✓ נשמר"), .error(...), .info(...).

(function () {
  const ROOT_ID = 'vt-toast-root';
  const REF_ID = 'vt-refresh-bar';

  function ensureRoot() {
    let el = document.getElementById(ROOT_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = ROOT_ID;
      el.className = 'toast-root';
      document.body.appendChild(el);
    }
    return el;
  }

  function ensureRefBar() {
    let el = document.getElementById(REF_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = REF_ID;
      el.className = 'refresh-bar';
      document.body.appendChild(el);
    }
    return el;
  }

  function makeToast({ kind = 'info', text = '', timeout = 3500 }) {
    const root = ensureRoot();
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML = `
      <span class="toast-icon">${kind === 'success' ? '✓' : kind === 'error' ? '✗' : kind === 'warn' ? '⚠' : 'ℹ'}</span>
      <span class="toast-text"></span>
      <button class="toast-close" aria-label="סגור">×</button>
    `;
    el.querySelector('.toast-text').textContent = text;
    el.querySelector('.toast-close').onclick = () => el.remove();
    root.appendChild(el);
    // אנימציית כניסה
    requestAnimationFrame(() => el.classList.add('toast-show'));
    if (timeout > 0) {
      setTimeout(() => {
        el.classList.remove('toast-show');
        setTimeout(() => el.remove(), 300);
      }, timeout);
    }
    return el;
  }

  window.toast = {
    success: (text, timeout) => makeToast({ kind: 'success', text, timeout: timeout ?? 2500 }),
    error:   (text, timeout) => makeToast({ kind: 'error',   text, timeout: timeout ?? 5000 }),
    warn:    (text, timeout) => makeToast({ kind: 'warn',    text, timeout: timeout ?? 4000 }),
    info:    (text, timeout) => makeToast({ kind: 'info',    text, timeout: timeout ?? 3000 }),
  };

  // ─── refresh bar: פס דק עליון שמופיע כשrefreshData רץ ───
  function showRefreshBar(reason) {
    const bar = ensureRefBar();
    bar.dataset.reason = reason || '';
    bar.classList.add('refresh-bar-active');
  }
  function hideRefreshBar() {
    const bar = ensureRefBar();
    bar.classList.remove('refresh-bar-active');
  }

  // האזן לאירועי רענון של data-live.jsx
  window.addEventListener('vintrack:refresh-start', (e) => {
    showRefreshBar(e.detail?.reason);
  });
  window.addEventListener('vintrack:data-updated', (e) => {
    hideRefreshBar();
    const reason = e.detail?.reason || '';
    // toast רק לרענון ידני (לא ל-interval/realtime/visibilitychange — מציק)
    if (reason === 'manual') {
      window.toast.success('הנתונים עודכנו');
    }
  });
  window.addEventListener('vintrack:refresh-error', (e) => {
    hideRefreshBar();
    window.toast.error('רענון נכשל: ' + (e.detail?.message || 'שגיאה'));
  });
})();
